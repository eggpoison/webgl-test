import { GameObjectData, HitboxType, Point, SETTINGS, TILE_TYPE_INFO_RECORD, Vector } from "webgl-test-shared";
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