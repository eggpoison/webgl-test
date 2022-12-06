import { ServerEntityData, EntityType, ENTITY_INFO_RECORD, Point, SETTINGS, TILE_TYPE_INFO_RECORD, Vector, HitboxType, ServerEntitySpecialData } from "webgl-test-shared";
import Chunk from "../Chunk";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Hitbox from "../hitboxes/Hitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import RenderPart, { RenderPartInfo } from "../render-parts/RenderPart";
import { Tile } from "../Tile";

let frameProgress: number;
export function setFrameProgress(newFrameProgress: number): void {
   frameProgress = newFrameProgress;
}

export function calculateRenderPosition(position: Point, velocity: Vector | null): Point {
   let entityRenderPosition = position.copy();
   
   // Account for frame progress
   if (velocity !== null) {
      const frameVelocity = velocity.copy();
      frameVelocity.magnitude *= frameProgress / SETTINGS.TPS;
      
      // Apply the frame velocity to the entity's position
      const framePoint = frameVelocity.convertToPoint();
      entityRenderPosition = entityRenderPosition.add(framePoint);
   }

   return entityRenderPosition;
}

const calculateEntityRenderPosition = (entity: Entity): Point => {
   let entityRenderPosition = entity.position.copy();
   
   // Account for frame progress
   if (entity.velocity !== null) {
      const tile = entity.findCurrentTile();
      const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type];

      const tileMoveSpeedMultiplier = tileTypeInfo.moveSpeedMultiplier || 1;

      const terminalVelocity = entity.terminalVelocity * tileMoveSpeedMultiplier;

      // 
      // Calculate the change in position that has occurred since the start of the frame
      // 
      let frameVelocity: Vector | null = entity.velocity.copy();
      
      // Accelerate
      if (entity.acceleration !== null) {
         const acceleration = entity.acceleration.copy();
         acceleration.magnitude *= tileTypeInfo.friction * tileMoveSpeedMultiplier / SETTINGS.TPS;

         const magnitudeBeforeAdd = entity.velocity?.magnitude || 0;
         // Add acceleration to velocity
         frameVelocity = frameVelocity?.add(acceleration) || acceleration;
         // Don't accelerate past terminal velocity
         if (frameVelocity.magnitude > terminalVelocity && entity.velocity.magnitude > magnitudeBeforeAdd) {
            frameVelocity.magnitude = terminalVelocity;
         }
      // Decelerate
      } else if (entity.velocity !== null) {
      }

      // Apply the frame velocity to the entity's position
      if (frameVelocity !== null) {
         frameVelocity.magnitude *= frameProgress / SETTINGS.TPS;

         const offset = frameVelocity.convertToPoint();
         entityRenderPosition = entityRenderPosition.add(offset);
      }
   }

   return entityRenderPosition;
}

export function calculateEntityRenderValues(): void {
   for (const entity of Object.values(Game.board.entities)) {
      entity.renderPosition = calculateEntityRenderPosition(entity);
   }
}

abstract class Entity {
   private static readonly MAX_ENTITY_COLLISION_PUSH_FORCE = 200;

   public readonly id: number;
   public readonly type: EntityType;

   public readonly hitbox: Hitbox<HitboxType>;
   public readonly hitboxHalfDiagonalLength?: number;

   /** Position of the entity */
   public position: Point;
   /** Velocity of the entity */
   public velocity: Vector | null = null;
   /** Acceleration of the entity */
   public acceleration: Vector | null = null;

   /** Estimated position of the entity during the current frame */
   public renderPosition: Point;

   /** Angle the entity is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation: number = 0;
   
   /** Limit to how many units the entity can move in a second */
   public terminalVelocity: number = 0;

   public readonly renderParts: ReadonlyArray<RenderPart<RenderPartInfo>>;

   public isMoving: boolean = true;

   public chunks: Array<Chunk>;

   public secondsSinceLastHit: number | null;

   public special?: ServerEntitySpecialData;

   constructor(position: Point, id: number, type: EntityType, secondsSinceLastHit: number | null, renderParts: ReadonlyArray<RenderPart<RenderPartInfo>>) {
      this.id = id;
      this.secondsSinceLastHit = secondsSinceLastHit;

      this.renderParts = renderParts;
      
      // Create hitbox using hitbox info
      const hitboxInfo = ENTITY_INFO_RECORD[type].hitbox;
      switch (hitboxInfo.type) {
         case "circular": {
            this.hitbox = new CircularHitbox(hitboxInfo, this);
            break;
         }
         case "rectangular": {
            this.hitbox = new RectangularHitbox(hitboxInfo, this);
            break;
         }
      }
      
      this.type = type;
      this.position = position;
      this.renderPosition = position;

      // Add entity to the ID record
      Game.board.entities[this.id] = this;

      // Calculate initial containing chunks
      if (this.hitbox.info.type === "rectangular") {
         (this.hitbox as RectangularHitbox).computeVertexPositions();
      }
      this.hitbox.updateHitboxBounds();
      this.chunks = this.calculateContainingChunks();

      // Add entity to chunks
      for (const chunk of this.chunks) {
         chunk.addEntity(this);
      }
   }

   public tick?(): void;

   public addVelocity(magnitude: number, direction: number): void {
      const velocity = new Vector(magnitude, direction);
      this.velocity = this.velocity?.add(velocity) || velocity;
   }

   public updateChunks(newChunks: ReadonlyArray<Chunk>): void {
      // Find all chunks which aren't present in the new chunks and remove them
      const removedChunks = this.chunks.filter(chunk => !newChunks.includes(chunk));
      for (const chunk of removedChunks) {
         chunk.removeEntity(this);
         this.chunks.splice(this.chunks.indexOf(chunk), 1);
      }

      // Add all new chunks
      const addedChunks = newChunks.filter(chunk => !this.chunks.includes(chunk));
      for (const chunk of addedChunks) {
         chunk.addEntity(this);
         this.chunks.push(chunk);
      }
   }

   public calculateContainingChunks(): Array<Chunk> {
      const minChunkX = Math.max(Math.min(Math.floor(this.hitbox.bounds[0] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(this.hitbox.bounds[1] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(this.hitbox.bounds[2] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(this.hitbox.bounds[3] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

      const chunks = new Array<Chunk>();
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = Game.board.getChunk(chunkX, chunkY);
            chunks.push(chunk);
         }
      }

      return chunks;
   }

   public applyPhysics(): void {
      const tile = this.findCurrentTile();
      const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type];

      const tileMoveSpeedMultiplier = tileTypeInfo.moveSpeedMultiplier || 1;

      const terminalVelocity = this.terminalVelocity * tileMoveSpeedMultiplier;

      // Friction
      if (this.velocity !== null) {
         this.velocity.magnitude /= 1 + 1 / SETTINGS.TPS;
      }
      
      // Accelerate
      if (this.acceleration !== null) {
         const acceleration = this.acceleration.copy();
         acceleration.magnitude *= tileTypeInfo.friction * tileMoveSpeedMultiplier / SETTINGS.TPS;

         const magnitudeBeforeAdd = this.velocity?.magnitude || 0;
         // Add acceleration to velocity
         this.velocity = this.velocity !== null ? this.velocity.add(acceleration) : acceleration;
         // Don't accelerate past terminal velocity
         if (this.velocity.magnitude > terminalVelocity && this.velocity.magnitude > magnitudeBeforeAdd) {
            if (magnitudeBeforeAdd < terminalVelocity) {
               this.velocity.magnitude = terminalVelocity;
            } else {
               this.velocity.magnitude = magnitudeBeforeAdd;
            }
         }
      // Friction
      } else if (this.velocity !== null) {
         this.velocity.magnitude -= 50 * tileTypeInfo.friction / SETTINGS.TPS;
         if (this.velocity.magnitude <= 0) {
            this.velocity = null;
         }
      }

      // Apply velocity
      if (this.velocity !== null) {
         const velocity = this.velocity.copy();
         velocity.magnitude /= SETTINGS.TPS;
         
         this.position = this.position.add(velocity.convertToPoint());
      }
   }

   private stopXVelocity(): void {
      if (this.velocity !== null) {
         const pointVelocity = this.velocity.convertToPoint();
         pointVelocity.x = 0;
         this.velocity = pointVelocity.convertToVector();
      }
   }

   private stopYVelocity(): void {
      if (this.velocity !== null) {
         const pointVelocity = this.velocity.convertToPoint();
         pointVelocity.y = 0;
         this.velocity = pointVelocity.convertToVector();
      }
   }

   public resolveWallCollisions(): void {
      const boardUnits = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE;

      // Left wall
      if (this.hitbox.bounds[0] < 0) {
         this.stopXVelocity();
         this.position.x -= this.hitbox.bounds[0];
      // Right wall
      } else if (this.hitbox.bounds[1] > boardUnits) {
         this.position.x -= this.hitbox.bounds[1] - boardUnits;
         this.stopXVelocity();
      }

      // Bottom wall
      if (this.hitbox.bounds[2] < 0) {
         this.position.y -= this.hitbox.bounds[2];
         this.stopYVelocity();
      // Top wall
      } else if (this.hitbox.bounds[3] > boardUnits) {
         this.position.y -= this.hitbox.bounds[3] - boardUnits;
         this.stopYVelocity();
      }
   }

   public findCurrentTile(): Tile {
      const tileX = Math.floor(this.position.x / SETTINGS.TILE_SIZE);
      const tileY = Math.floor(this.position.y / SETTINGS.TILE_SIZE);
      return Game.board.getTile(tileX, tileY);
   }

   public getChunk(): Chunk {
      const x = Math.floor(this.position.x / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE);
      const y = Math.floor(this.position.y / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE);
      return Game.board.getChunk(x, y);
   }

   public updateFromData(entityData: ServerEntityData): void {
      this.position = Point.unpackage(entityData.position);
      this.velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      this.acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null;
      this.terminalVelocity = entityData.terminalVelocity;
      this.rotation = entityData.rotation;
      this.secondsSinceLastHit = entityData.secondsSinceLastHit;
      this.special = entityData.special;

      this.updateChunks(entityData.chunkCoordinates.map(([x, y]) => Game.board.getChunk(x, y)));
   }

   public resolveEntityCollisions(): void {
      const collidingEntities = this.getCollidingEntities();

      for (const entity of collidingEntities) {
         // Push both entities away from each other
         const force = Entity.MAX_ENTITY_COLLISION_PUSH_FORCE / SETTINGS.TPS;
         const angle = this.position.angleBetween(entity.position);

         // No need to apply force to other entity as they will do it themselves
         this.addVelocity(force, angle + Math.PI);
      }
   }

   private getCollidingEntities(): ReadonlyArray<Entity> {
      const collidingEntities = new Array<Entity>();

      for (const chunk of this.chunks) {
         for (const entity of chunk.getEntities()) {
            if (entity === this) continue;

            if (this.hitbox.isColliding(entity.hitbox)) {
               collidingEntities.push(entity);
            }
         }
      }

      return collidingEntities;
   }
}

export default Entity;