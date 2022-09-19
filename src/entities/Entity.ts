import { circleAndRectangleDoIntersect, circlesDoIntersect, CircularHitbox, EntityData, EntityType, ENTITY_INFO_RECORD, Hitbox, HitboxVertexPositions, Point, rectanglePointsDoIntersect, RectangularHitbox, rotatePoint, SETTINGS, Tile, TILE_TYPE_INFO_RECORD, Vector } from "webgl-test-shared";
import Board, { EntityHitboxInfo } from "../Board";
import Chunk from "../Chunk";

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

      const terminalVelocity = entity.terminalVelocity * (tileTypeInfo.moveSpeedMultiplier || 1);

      // 
      // Calculate the change in position that has occurred since the start of the frame
      // 
      let frameVelocity = entity.velocity.copy();

      // Apply acceleration
      if (entity.acceleration !== null) {
         const acceleration = entity.acceleration.copy();
         acceleration.magnitude /= SETTINGS.TPS;

         // Reduce acceleration due to friction
         const friction = tileTypeInfo.friction;
         acceleration.magnitude *= friction;
          
         // Apply tile speed multiplier
         if (typeof tileTypeInfo.moveSpeedMultiplier !== "undefined") {
            acceleration.magnitude *= tileTypeInfo.moveSpeedMultiplier;
         }

         const magnitudeBeforeAdd = frameVelocity.magnitude;
         
         // Add acceleration to velocity
         frameVelocity = frameVelocity.add(acceleration);

         // Don't accelerate past terminal velocity
         if (frameVelocity.magnitude > terminalVelocity && frameVelocity.magnitude > magnitudeBeforeAdd) {
            frameVelocity.magnitude = magnitudeBeforeAdd;
         }
      }
      // Apply friction if the entity isn't accelerating
      else { 
         const friction = tileTypeInfo.friction * SETTINGS.GLOBAL_FRICTION_CONSTANT / SETTINGS.TPS;
         frameVelocity.magnitude /= 1 + friction;
      }

      // Apply friction if the entity isn't accelerating
      const friction = tileTypeInfo.friction * SETTINGS.GLOBAL_FRICTION_CONSTANT / SETTINGS.TPS;
      frameVelocity.magnitude /= 1 + friction;

      // Restrict the entity's velocity to their terminal velocity
      if (terminalVelocity > 0) {
         const mach = Math.abs(frameVelocity.magnitude / terminalVelocity);
         if (mach > 1) {
            frameVelocity.magnitude /= 1 + (mach - 1) / SETTINGS.TPS;
         }
      }

      frameVelocity.magnitude *= frameProgress / SETTINGS.TPS;
      
      // Apply the frame velocity to the entity's position
      const framePoint = frameVelocity.convertToPoint();
      entityRenderPosition = entityRenderPosition.add(framePoint);
   }

   return entityRenderPosition;
}

export function calculateEntityRenderPositions(): void {
   for (const entity of Object.values(Board.entities)) {
      entity.renderPosition = calculateEntityRenderPosition(entity);
   }
}

const isColliding = (entity1: Entity, entity2: Entity, entityHitboxInfoRecord: { [id: number]: EntityHitboxInfo }): boolean => {
   // Circle-circle collisions
   if (entity1.hitbox.type === "circular" && entity2.hitbox.type === "circular") {
      return circlesDoIntersect(entity1.position, entity1.hitbox.radius, entity2.position, entity2.hitbox.radius);
   }
   // Circle-rectangle collisions
   else if ((entity1.hitbox.type === "circular" && entity2.hitbox.type === "rectangular") || (entity1.hitbox.type === "rectangular" && entity2.hitbox.type === "circular")) {
      let circleEntity: Entity;
      let rectEntity: Entity;
      if (entity1.hitbox.type === "circular") {
         circleEntity = entity1;
         rectEntity = entity2;
      } else {
         rectEntity = entity1;
         circleEntity = entity2;
      }

      return circleAndRectangleDoIntersect(circleEntity.position, (circleEntity.hitbox as CircularHitbox).radius, rectEntity.position, (rectEntity.hitbox as RectangularHitbox).width, (rectEntity.hitbox as RectangularHitbox).height, rectEntity.rotation);
   }
   // Rectangle-rectangle collisions
   else if (entity1.hitbox.type === "rectangular" && entity2.hitbox.type === "rectangular") {
      return rectanglePointsDoIntersect(...entityHitboxInfoRecord[entity1.id].vertexPositions, ...entityHitboxInfoRecord[entity2.id].vertexPositions, entityHitboxInfoRecord[entity1.id].sideAxes, entityHitboxInfoRecord[entity2.id].sideAxes);
   }

   throw new Error(`No collision calculations for collision between hitboxes of type ${entity1.hitbox.type} and ${entity2.hitbox.type}`);
}

abstract class Entity {
   private static readonly MAX_ENTITY_COLLISION_PUSH_FORCE = 200;

   public readonly id: number;
   public readonly type: EntityType;

   public readonly hitbox: Hitbox;

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

      this.hitbox = ENTITY_INFO_RECORD[this.type].hitbox;
      
      this.position = position;
      this.velocity = velocity;
      this.acceleration = acceleration;
      this.terminalVelocity = terminalVelocity;
      this.rotation = rotation;

      this.renderPosition = position;

      // Add entity to the ID record
      Board.entities[this.id] = this;

      // Calculate initial containing chunks
      const hitboxVertexPositions = this.calculateHitboxVertexPositions();
      const hitboxBounds = this.calculateHitboxBounds(hitboxVertexPositions);
      this.chunks = this.calculateContainingChunks(hitboxBounds);

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

   public calculateContainingChunks([minX, maxX, minY, maxY]: [number, number, number, number]): Array<Chunk> {
      const minChunkX = Math.max(Math.min(Math.floor(minX / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxX / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minY / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxY / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

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

      const terminalVelocity = this.terminalVelocity * (tileTypeInfo.moveSpeedMultiplier || 1);
      
      // Apply acceleration
      if (this.acceleration !== null) {
         const acceleration = this.acceleration.copy();
         acceleration.magnitude /= SETTINGS.TPS;

         // Reduce acceleration due to friction
         const friction = tileTypeInfo.friction;
         acceleration.magnitude *= friction;
          
         // Apply tile speed multiplier
         if (typeof tileTypeInfo.moveSpeedMultiplier !== "undefined") {
            acceleration.magnitude *= tileTypeInfo.moveSpeedMultiplier;
         }

         const magnitudeBeforeAdd = this.velocity?.magnitude || 0;
         
         // Add acceleration to velocity
         this.velocity = this.velocity !== null ? this.velocity.add(acceleration) : acceleration;

         // Don't accelerate past terminal velocity
         if (this.velocity.magnitude > terminalVelocity && this.velocity.magnitude > magnitudeBeforeAdd) {
            this.velocity.magnitude = magnitudeBeforeAdd;
         }
      }
      // Apply friction if the entity isn't accelerating
      else if (this.velocity !== null) { 
         const friction = tileTypeInfo.friction * SETTINGS.GLOBAL_FRICTION_CONSTANT / SETTINGS.TPS;
         this.velocity.magnitude /= 1 + friction;
      }

      // Restrict the entity's velocity to their terminal velocity
      if (this.velocity !== null && terminalVelocity > 0) {
         const mach = Math.abs(this.velocity.magnitude / terminalVelocity);
         if (mach > 1) {
            this.velocity.magnitude /= 1 + (mach - 1) / SETTINGS.TPS;
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
         // Stop y velocity
         const pointVelocity = this.velocity.convertToPoint();
         pointVelocity.y = 0;
         this.velocity = pointVelocity.convertToVector();
      }
   }

   /** Only runs on entities with a rectangular hitobx */
   public calculateHitboxVertexPositions(): HitboxVertexPositions | null {
      if (this.hitbox.type !== "rectangular") return null;

      const x1 = this.position.x - this.hitbox.width / 2;
      const x2 = this.position.x + this.hitbox.width / 2;
      const y1 = this.position.y - this.hitbox.height / 2;
      const y2 = this.position.y + this.hitbox.height / 2;

      let topLeft = new Point(x1, y2);
      let topRight = new Point(x2, y2);
      let bottomLeft = new Point(x1, y1);
      let bottomRight = new Point(x2, y1);

      // Rotate the points to match the entity's rotation
      topLeft = rotatePoint(topLeft, this.position, this.rotation);
      topRight = rotatePoint(topRight, this.position, this.rotation);
      bottomLeft = rotatePoint(bottomLeft, this.position, this.rotation);
      bottomRight = rotatePoint(bottomRight, this.position, this.rotation);

      return [topLeft, topRight, bottomLeft, bottomRight];
   }

   public calculateHitboxBounds(hitboxVertexPositions: HitboxVertexPositions | null): [minX: number, maxX: number, minY: number, maxY: number] {
      let minX: number;
      let maxX: number;
      let minY: number;
      let maxY: number;

      switch (this.hitbox.type) {
         case "circular": {
            minX = this.position.x - this.hitbox.radius;
            maxX = this.position.x + this.hitbox.radius;
            minY = this.position.y - this.hitbox.radius;
            maxY = this.position.y + this.hitbox.radius;

            break;
         }
         case "rectangular": {
            const [tl, tr, bl, br] = hitboxVertexPositions!;

            minX = Math.min(tl.x, tr.x, bl.x, br.x);
            maxX = Math.max(tl.x, tr.x, bl.x, br.x);
            minY = Math.min(tl.y, tr.y, bl.y, br.y);
            maxY = Math.max(tl.y, tr.y, bl.y, br.y);

            break;
         }
      }

      return [minX, maxX, minY, maxY];
   }

   public resolveWallCollisions([minX, maxX, minY, maxY]: [number, number, number, number]): void {
      const boardUnits = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE;

      // Left wall
      if (minX < 0) {
         this.stopXVelocity();
         this.position.x -= minX;
      // Right wall
      } else if (maxX > boardUnits) {
         this.position.x -= maxX - boardUnits;
         this.stopXVelocity();
      }

      // Bottom wall
      if (minY < 0) {
         this.position.y -= minY;
         this.stopYVelocity();
      // Top wall
      } else if (maxY > boardUnits) {
         this.position.y -= maxY - boardUnits;
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

   public updateFromData(entityData: EntityData<EntityType>): void {
      this.position = Point.unpackage(entityData.position);
      this.velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      this.acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null;
      this.terminalVelocity = entityData.terminalVelocity;
      this.rotation = entityData.rotation;

      this.updateChunks(entityData.chunks.map(([x, y]) => Board.getChunk(x, y)));
   }

   public resolveCollisions(entityHitboxInfoRecord: { [id: number]: EntityHitboxInfo }): void {
      const collidingEntities = this.getCollidingEntities(entityHitboxInfoRecord);

      for (const entity of collidingEntities) {
         // Push both entities away from each other
         const force = Entity.MAX_ENTITY_COLLISION_PUSH_FORCE / SETTINGS.TPS;
         const angle = this.position.angleBetween(entity.position);

         // No need to apply force to other entity as they will do it themselves
         this.addVelocity(force, angle + Math.PI);
      }
   }

   private getCollidingEntities(entityHitboxInfoRecord: { [id: number]: EntityHitboxInfo }): ReadonlyArray<Entity> {
      const collidingEntities = new Array<Entity>();

      for (const chunk of this.chunks) {
         for (const entity of chunk.getEntities()) {
            if (entity === this) continue;

            if (isColliding(this, entity, entityHitboxInfoRecord)) {
               collidingEntities.push(entity);
            }
         }
      }

      return collidingEntities;
   }
}

export default Entity;