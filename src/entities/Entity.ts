import { EntityData, EntityType, Point, SETTINGS, TILE_TYPE_INFO_RECORD, Vector, HitboxType, ServerEntitySpecialData, curveWeight } from "webgl-test-shared";
import Chunk from "../Chunk";
import Game from "../Game";
import Hitbox from "../hitboxes/Hitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import RenderPart from "../render-parts/RenderPart";
import { Tile } from "../Tile";

let frameProgress: number;
export function setFrameProgress(newFrameProgress: number): void {
   frameProgress = newFrameProgress;
}

export function getFrameProgress(): number {
   return frameProgress;
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
         if (frameVelocity !== null) {
            frameVelocity.add(acceleration);
         } else {
            frameVelocity = acceleration;
         }

         // Don't accelerate past terminal velocity
         if (frameVelocity.magnitude > terminalVelocity && entity.velocity.magnitude > magnitudeBeforeAdd) {
            frameVelocity.magnitude = terminalVelocity;
         }
      }

      // Apply the frame velocity to the entity's position
      if (frameVelocity !== null) {
         frameVelocity.magnitude *= frameProgress / SETTINGS.TPS;

         const offset = frameVelocity.convertToPoint();
         entityRenderPosition.add(offset);
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
   public readonly id: number;
   public abstract readonly type: EntityType;

   public readonly hitboxes: ReadonlySet<Hitbox<HitboxType>>;
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

   /** Stores all render parts attached to the entity, in ascending order of their z-indexes. */
   public readonly renderParts = new Array<RenderPart>();

   public chunks: Set<Chunk>;

   public secondsSinceLastHit: number | null;

   public special?: ServerEntitySpecialData;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      this.id = id;
      this.secondsSinceLastHit = secondsSinceLastHit;

      // Create hitbox using hitbox info
      this.hitboxes = hitboxes;
      
      this.position = position;
      this.renderPosition = position;

      // Add entity to the ID record
      Game.board.entities[this.id] = this;

      // Calculate initial containing chunks
      for (const hitbox of this.hitboxes) {
         hitbox.setEntity(this); 
         if (hitbox.info.type === "rectangular") {
            (hitbox as RectangularHitbox).computeVertexPositions();
         }
         hitbox.updateHitboxBounds();
      }
      this.chunks = this.calculateContainingChunks();

      // Add entity to chunks
      for (const chunk of this.chunks) {
         chunk.addEntity(this);
      }
   }

   public attachRenderParts(renderParts: ReadonlyArray<RenderPart>): void {
      for (const renderPart of renderParts) {
         // Find an index for the render part
         let idx = 0;
         for (idx = 0; idx < this.renderParts.length; idx++) {
            const currentRenderPart = this.renderParts[idx];
            if (renderPart.zIndex <= currentRenderPart.zIndex) {
               break;
            }
         }

         // Insert the render part at the index
         this.renderParts.splice(idx, 0, renderPart);
      }
   }

   public tick?(): void;

   public updateChunks(newChunks: ReadonlySet<Chunk>): void {
      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!newChunks.has(chunk)) {
            chunk.removeEntity(this);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of newChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(this);
            this.chunks.add(chunk);
         }
      }
   }

   public calculateContainingChunks(): Set<Chunk> {
      const chunks = new Set<Chunk>();
      for (const hitbox of this.hitboxes) {
         const minChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[0] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[1] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[2] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[3] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = Game.board.getChunk(chunkX, chunkY);
               if (!chunks.has(chunk)) {
                  chunks.add(chunk);
               }
            }
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
         if (this.velocity !== null) {
            this.velocity.add(acceleration);
         } else {
            this.velocity = acceleration;
         }
         
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
         this.velocity.magnitude -= SETTINGS.FRICTION_CONSTANT * tileTypeInfo.friction / SETTINGS.TPS;
         if (this.velocity.magnitude <= 0) {
            this.velocity = null;
         }
      }

      // Apply velocity
      if (this.velocity !== null) {
         const velocity = this.velocity.copy();
         velocity.magnitude /= SETTINGS.TPS;
         
         this.position.add(velocity.convertToPoint());
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

      for (const hitbox of this.hitboxes) {
         // Left wall
         if (hitbox.bounds[0] < 0) {
            this.stopXVelocity();
            this.position.x -= hitbox.bounds[0];
            // Right wall
         } else if (hitbox.bounds[1] > boardUnits) {
            this.position.x -= hitbox.bounds[1] - boardUnits;
            this.stopXVelocity();
         }
         
         // Bottom wall
         if (hitbox.bounds[2] < 0) {
            this.position.y -= hitbox.bounds[2];
            this.stopYVelocity();
            // Top wall
         } else if (hitbox.bounds[3] > boardUnits) {
            this.position.y -= hitbox.bounds[3] - boardUnits;
            this.stopYVelocity();
         }
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

   public updateFromData(entityData: EntityData<EntityType>): void {
      this.position = Point.unpackage(entityData.position);
      this.velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      this.acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null;
      this.terminalVelocity = entityData.terminalVelocity;
      this.rotation = entityData.rotation;
      this.secondsSinceLastHit = entityData.secondsSinceLastHit;
      this.special = entityData.special;

      this.updateChunks(new Set(entityData.chunkCoordinates.map(([x, y]) => Game.board.getChunk(x, y))));
   }

   public resolveEntityCollisions(): void {
      const collidingEntities = this.getCollidingEntities();

      for (const entity of collidingEntities) {
         // If the two entities are exactly on top of each other, don't do anything
         if (entity.position.x === this.position.x && entity.position.y === this.position.y) {
            continue;
         }

         // Calculate the force of the push
         // Force gets greater the closer together the entities are
         const distanceBetweenEntities = this.position.calculateDistanceBetween(entity.position);
         const maxDistanceBetweenEntities = this.calculateMaxDistanceFromEntity(entity);
         let forceMultiplier = 1 - distanceBetweenEntities / maxDistanceBetweenEntities;
         forceMultiplier = curveWeight(forceMultiplier, 2, 0.2);

         // Push both entities away from each other
         const force = SETTINGS.ENTITY_PUSH_FORCE / SETTINGS.TPS * forceMultiplier;
         const angle = this.position.calculateAngleBetween(entity.position);

         // No need to apply force to other entity as they will do it themselves
         const pushForce = new Vector(force, angle + Math.PI);
         if (this.velocity !== null) {
            this.velocity.add(pushForce);
         } else {
            this.velocity = pushForce;
         }
      }
   }

   private calculateMaxDistanceFromEntity(entity: Entity): number {
      let maxDist = 0;

      // Account for this entity's hitboxes
      for (const hitbox of this.hitboxes) {
         switch (hitbox.info.type) {
            case "circular": {
               maxDist += hitbox.info.radius;
               break;
            }
            case "rectangular": {
               maxDist += (hitbox as RectangularHitbox).halfDiagonalLength;
               break;
            }
         }
      }

      // Account for the other entity's hitboxes
      for (const hitbox of entity.hitboxes) {
         switch (hitbox.info.type) {
            case "circular": {
               maxDist += hitbox.info.radius;
               break;
            }
            case "rectangular": {
               maxDist += (hitbox as RectangularHitbox).halfDiagonalLength;
               break;
            }
         }
      }
      
      return maxDist;
   }

   private getCollidingEntities(): ReadonlyArray<Entity> {
      const collidingEntities = new Array<Entity>();

      for (const chunk of this.chunks) {
         for (const entity of chunk.getEntities()) {
            if (entity === this) continue;

            for (const hitbox of this.hitboxes) {
               for (const otherHitbox of entity.hitboxes) {
                  if (hitbox.isColliding(otherHitbox)) {
                     collidingEntities.push(entity);
                  }
               }
            }
         }
      }

      return collidingEntities;
   }
}

export default Entity;