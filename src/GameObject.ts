import { GameObjectData, HitboxType, Point, SETTINGS, TILE_TYPE_INFO_RECORD, Vector, curveWeight } from "webgl-test-shared";
import RenderPart, { RenderObject } from "./render-parts/RenderPart";
import Hitbox from "./hitboxes/Hitbox";
import Chunk from "./Chunk";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import Game from "./Game";
import { Tile } from "./Tile";

let frameProgress: number;
export function setFrameProgress(newFrameProgress: number): void {
   frameProgress = newFrameProgress;
}

export function getFrameProgress(): number {
   return frameProgress;
}

const calculateGameObjectRenderPosition = (gameObject: GameObject): Point => {
   let renderPosition = gameObject.position.copy();
   
   // Account for frame progress
   if (gameObject.velocity !== null) {
      const tile = gameObject.findCurrentTile();
      const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type];

      const tileMoveSpeedMultiplier = tileTypeInfo.moveSpeedMultiplier || 1;

      const terminalVelocity = gameObject.terminalVelocity * tileMoveSpeedMultiplier;

      // 
      // Calculate the change in position that has occurred since the start of the frame
      // 
      let frameVelocity: Vector | null = gameObject.velocity.copy();
      
      // Accelerate
      if (gameObject.acceleration !== null) {
         const acceleration = gameObject.acceleration.copy();
         acceleration.magnitude *= tileTypeInfo.friction * tileMoveSpeedMultiplier / SETTINGS.TPS;

         const magnitudeBeforeAdd = gameObject.velocity?.magnitude || 0;

         // Add acceleration to velocity
         if (frameVelocity !== null) {
            frameVelocity.add(acceleration);
         } else {
            frameVelocity = acceleration;
         }

         // Don't accelerate past terminal velocity
         if (frameVelocity.magnitude > terminalVelocity && gameObject.velocity.magnitude > magnitudeBeforeAdd) {
            frameVelocity.magnitude = terminalVelocity;
         }
      }

      // Apply the frame velocity to the object's position
      if (frameVelocity !== null) {
         frameVelocity.magnitude *= frameProgress / SETTINGS.TPS;

         const offset = frameVelocity.convertToPoint();
         renderPosition.add(offset);
      }
   }

   return renderPosition;
}

abstract class GameObject extends RenderObject {
   public readonly id: number;

   /** Position of the object */
   public position: Point;
   /** Velocity of the object */
   public velocity: Vector | null = null;
   /** Acceleration of the object */
   public acceleration: Vector | null = null;

   /** Estimated position of the object during the current frame */
   public renderPosition!: Point;

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation: number = 0;

   /** Stores all render parts attached to the object, in ascending order of their z-indexes. */
   public readonly renderParts = new Array<RenderPart>();

   public readonly hitboxes!: ReadonlySet<Hitbox<HitboxType>>;
   public readonly hitboxHalfDiagonalLength?: number;
   
   /** Limit to how many units the object can move in a second */
   public terminalVelocity: number = 0;

   public chunks!: Set<Chunk>;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, a: boolean = false) {
      super();
      
      this.position = position;
      this.renderPosition = position;

      this.id = id;

      // Create hitbox using hitbox info
      this.hitboxes = hitboxes;
      
      // Calculate initial containing chunks
      for (const hitbox of this.hitboxes) {
         hitbox.setObject(this); 
         if (hitbox.info.type === "rectangular") {
            (hitbox as RectangularHitbox).computeVertexPositions();
         }
         hitbox.updateHitboxBounds();
      }
      this.chunks = this.calculateContainingChunks();
      
      // Add game object to chunks
      for (const chunk of this.chunks) {
         chunk.addGameObject(this);
      }
      Game.board.gameObjects[this.id] = this;
   }

   public tick?(): void;

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

   public resolveGameObjectCollisions(): void {
      const collidingEntities = this.getCollidingGameObjects();

      for (const gameObject of collidingEntities) {
         // If the two entities are exactly on top of each other, don't do anything
         if (gameObject.position.x === this.position.x && gameObject.position.y === this.position.y) {
            continue;
         }

         // Calculate the force of the push
         // Force gets greater the closer together the entities are
         const distanceBetweenEntities = this.position.calculateDistanceBetween(gameObject.position);
         const maxDistanceBetweenEntities = this.calculateMaxDistanceFromGameObject(gameObject);
         let forceMultiplier = 1 - distanceBetweenEntities / maxDistanceBetweenEntities;
         forceMultiplier = curveWeight(forceMultiplier, 2, 0.2);

         // Push both entities away from each other
         const force = SETTINGS.ENTITY_PUSH_FORCE / SETTINGS.TPS * forceMultiplier;
         const angle = this.position.calculateAngleBetween(gameObject.position);

         // No need to apply force to other object as they will do it themselves
         const pushForce = new Vector(force, angle + Math.PI);
         if (this.velocity !== null) {
            this.velocity.add(pushForce);
         } else {
            this.velocity = pushForce;
         }
      }
   }

   private calculateMaxDistanceFromGameObject(gameObject: GameObject): number {
      let maxDist = 0;

      // Account for this object's hitboxes
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

      // Account for the other object's hitboxes
      for (const hitbox of gameObject.hitboxes) {
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

   private getCollidingGameObjects(): ReadonlyArray<GameObject> {
      const collidingGameObjects = new Array<GameObject>();

      for (const chunk of this.chunks) {
         for (const gameObject of chunk.getGameObjects()) {
            if (gameObject === this) continue;

            for (const hitbox of this.hitboxes) {
               for (const otherHitbox of gameObject.hitboxes) {
                  if (hitbox.isColliding(otherHitbox)) {
                     collidingGameObjects.push(gameObject);
                  }
               }
            }
         }
      }

      return collidingGameObjects;
   }

   public updateChunks(newChunks: ReadonlySet<Chunk>): void {
      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!newChunks.has(chunk)) {
            chunk.removeGameObject(this);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of newChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addGameObject(this);
            this.chunks.add(chunk);
         }
      }
   }

   public updateRenderPosition(): void {
      this.renderPosition = calculateGameObjectRenderPosition(this);
   }

   public updateFromData(data: GameObjectData): void {
      this.position = Point.unpackage(data.position);
      this.velocity = data.velocity !== null ? Vector.unpackage(data.velocity) : null;
      this.acceleration = data.acceleration !== null ? Vector.unpackage(data.acceleration) : null;
      this.terminalVelocity = data.terminalVelocity;
      this.rotation = data.rotation;

      this.updateChunks(new Set(data.chunkCoordinates.map(([x, y]) => Game.board.getChunk(x, y))));
   }

   public remove?(): void;
}

export default GameObject;