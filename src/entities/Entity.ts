import { circleAndRectangleDoIntersect, circlesDoIntersect, CircularHitboxInfo, ServerEntityData, EntityType, ENTITY_INFO_RECORD, HitboxInfo, HitboxVertexPositions, Point, rectanglePointsDoIntersect, RectangularHitboxInfo, rotatePoint, SETTINGS, TILE_TYPE_INFO_RECORD, Vector, HitboxType } from "webgl-test-shared";
import Board, { EntityHitboxInfo } from "../Board";
import Chunk from "../Chunk";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Hitbox, { HitboxBounds } from "../hitboxes/Hitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { Tile } from "../Tile";

interface BaseRenderPart {
   readonly type: string;
   readonly offset?: Point | (() => Point);
   readonly zIndex: number;
}

export interface CircleRenderPart extends BaseRenderPart {
   readonly type: "circle";
   readonly rgba: [number, number, number, number];
   readonly radius: number;
}

export interface ImageRenderPart extends BaseRenderPart {
   readonly type: "image";
   readonly width: number;
   readonly height: number;
   readonly textureSrc: string;
}

export type RenderPart = CircleRenderPart | ImageRenderPart;

// Sort render parts from lowest z-index to highest z-index
export function sortRenderParts(unsortedRenderParts: ReadonlyArray<RenderPart>): ReadonlyArray<RenderPart> {
   const sortedRenderParts = unsortedRenderParts.slice();
   for (let i = 0; i < unsortedRenderParts.length - 1; i++) {
      for (let j = i; j < unsortedRenderParts.length - 1; j++) {
         if (sortedRenderParts[j].zIndex > sortedRenderParts[j + 1].zIndex) {
            const temp = sortedRenderParts[j + 1];
            sortedRenderParts[j + 1] = sortedRenderParts[j];
            sortedRenderParts[j] = temp;
         }
      }
   }

   return sortedRenderParts;
}

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

export function calculateEntityRenderPositions(): void {
   for (const entity of Object.values(Board.entities)) {
      entity.renderPosition = calculateEntityRenderPosition(entity);
   }
}

// const isColliding = (entity1: Entity, entity2: Entity, entityHitboxInfoRecord: { [id: number]: EntityHitboxInfo }): boolean => {
//    // Circle-circle collisions
//    if (entity1.hitbox.type === "circular" && entity2.hitbox.type === "circular") {
//       return circlesDoIntersect(entity1.position, entity1.hitbox.radius, entity2.position, entity2.hitbox.radius);
//    }
//    // Circle-rectangle collisions
//    else if ((entity1.hitbox.type === "circular" && entity2.hitbox.type === "rectangular") || (entity1.hitbox.type === "rectangular" && entity2.hitbox.type === "circular")) {
//       let circleEntity: Entity;
//       let rectEntity: Entity;
//       if (entity1.hitbox.type === "circular") {
//          circleEntity = entity1;
//          rectEntity = entity2;
//       } else {
//          rectEntity = entity1;
//          circleEntity = entity2;
//       }

//       return circleAndRectangleDoIntersect(circleEntity.position, (circleEntity.hitbox as CircularHitboxInfo).radius, rectEntity.position, (rectEntity.hitbox as RectangularHitboxInfo).width, (rectEntity.hitbox as RectangularHitboxInfo).height, rectEntity.rotation);
//    }
//    // Rectangle-rectangle collisions
//    else if (entity1.hitbox.type === "rectangular" && entity2.hitbox.type === "rectangular") {
//       const distance = entity1.position.distanceFrom(entity2.position);
//       const diagonal1Squared = Math.sqrt((Math.pow(entity1.hitbox.width / 2, 2) + Math.pow(entity1.hitbox.height / 2, 2)) / 4);
//       const diagonal2Squared = Math.sqrt((Math.pow(entity2.hitbox.width / 2, 2) + Math.pow(entity2.hitbox.height / 2, 2)) / 4);
//       if (distance > diagonal1Squared + diagonal2Squared) {
//          return false;
//       }

//       return rectanglePointsDoIntersect(...entityHitboxInfoRecord[entity1.id].vertexPositions, ...entityHitboxInfoRecord[entity2.id].vertexPositions, entityHitboxInfoRecord[entity1.id].sideAxes, entityHitboxInfoRecord[entity2.id].sideAxes);
//    }

//    throw new Error(`No collision calculations for collision between hitboxes of type ${entity1.hitbox.type} and ${entity2.hitbox.type}`);
// }

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

   /** Direction the entity is facing (radians) */
   public rotation: number;
   
   /** Limit to how many units the entity can move in a second */
   public terminalVelocity: number = 0;

   protected readonly abstract renderParts: ReadonlyArray<RenderPart>;

   public isMoving: boolean = true;

   public chunks: Array<Chunk>;

   constructor(id: number, type: EntityType, position: Point, velocity: Vector | null, acceleration: Vector | null, terminalVelocity: number, rotation: number) {
      this.id = id;
      this.type = type;

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
      
      this.position = position;
      this.velocity = velocity;
      this.acceleration = acceleration;
      this.terminalVelocity = terminalVelocity;
      this.rotation = rotation;

      this.renderPosition = position;

      // Add entity to the ID record
      Board.entities[this.id] = this;

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
            const chunk = Board.getChunk(chunkX, chunkY);
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
      return Board.getTile(tileX, tileY);
   }

   public getChunk(): Chunk {
      const x = Math.floor(this.position.x / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE);
      const y = Math.floor(this.position.y / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE);
      return Board.getChunk(x, y);
   }

   public getRenderParts(): ReadonlyArray<RenderPart> {
      return this.renderParts;
   }

   public updateFromData(entityData: ServerEntityData): void {
      this.position = Point.unpackage(entityData.position);
      this.velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      this.acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null;
      this.terminalVelocity = entityData.terminalVelocity;
      this.rotation = entityData.rotation;

      this.updateChunks(entityData.chunkCoordinates.map(([x, y]) => Board.getChunk(x, y)));
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