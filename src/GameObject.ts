import { GameObjectData, Point, RIVER_STEPPING_STONE_SIZES, SETTINGS, TILE_FRICTIONS, TILE_MOVE_SPEED_MULTIPLIERS, TileType, distance } from "webgl-test-shared";
import RenderPart, { RenderObject } from "./render-parts/RenderPart";
import Chunk from "./Chunk";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import { Tile } from "./Tile";
import CircularHitbox from "./hitboxes/CircularHitbox";
import Board from "./Board";
import Entity from "./entities/Entity";
import { createWaterSplashParticle } from "./generic-particles";

let frameProgress: number;
export function setFrameProgress(newFrameProgress: number): void {
   frameProgress = newFrameProgress;
}

export function getFrameProgress(): number {
   return frameProgress;
}

abstract class GameObject extends RenderObject {
   public readonly id: number;

   public position: Point;
   public velocity = new Point(0, 0);
   public acceleration = new Point(0, 0);

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation = 0;

   public mass = 1;

   public ageTicks = 0;

   public tile!: Tile;

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly allRenderParts = new Array<RenderPart>();

   public readonly hitboxes!: ReadonlySet<CircularHitbox | RectangularHitbox>;
   public readonly hitboxHalfDiagonalLength?: number;
   
   /** Limit to how many units the object can move in a second */
   public terminalVelocity: number = 0;

   public chunks = new Set<Chunk>();

   /** Visual depth of the game object while being rendered */
   public readonly renderDepth: number;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;

   /** Amount the game object's render parts will shake */
   public shakeAmount = 0;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number) {
      super();
      
      this.position = position;
      this.renderPosition.x = position.x;
      this.renderPosition.y = position.y;
      this.id = id;
      this.renderDepth = renderDepth;

      // Create hitbox using hitbox info
      this.hitboxes = hitboxes;
      
      for (const hitbox of this.hitboxes) {
         hitbox.updateFromGameObject(this);
         hitbox.updateHitboxBounds(this.rotation);
      }

      this.updateCurrentTile();

      // Note: The chunks are calculated outside of the constructor immediately after the game object is created
      // so that all constructors have time to run
   }

   public onRemove?(): void;

   protected overrideTileMoveSpeedMultiplier?(): number | null;

   public tick(): void {
      this.tintR = 0;
      this.tintG = 0;
      this.tintB = 0;
      
      // Water droplet particles
      // @Cleanup: Don't hardcode fish condition
      if (this.isInRiver() && Board.tickIntervalHasPassed(0.05) && (!(this instanceof Entity) || this.type !== "fish")) {
         createWaterSplashParticle(this.position.x, this.position.y);
      }
   };

   protected isInRiver(): boolean {
      if (this.tile.type !== TileType.water) {
         return false;
      }

      // If the game object is standing on a stepping stone they aren't in a river
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const dist = distance(this.position.x, this.position.y, steppingStone.positionX, steppingStone.positionY);
            if (dist <= size/2) {
               return false;
            }
         }
      }

      return true;
   }

   public applyPhysics(): void {
      let tileMoveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[this.tile.type];
      if (this.tile.type === TileType.water && !this.isInRiver()) {
         tileMoveSpeedMultiplier = 1;
      }

      // @Cleanup: This is scuffed
      if (typeof this.overrideTileMoveSpeedMultiplier !== "undefined") {
         const speed = this.overrideTileMoveSpeedMultiplier();
         if (speed !== null) {
            tileMoveSpeedMultiplier = speed;
         }
      }
      
      // Accelerate
      if (this.acceleration.x !== 0 || this.acceleration.y !== 0) {
         const terminalVelocity = this.terminalVelocity * tileMoveSpeedMultiplier;

         const friction = TILE_FRICTIONS[this.tile.type];
         let accelerateAmountX = this.acceleration.x * friction * tileMoveSpeedMultiplier / SETTINGS.TPS;
         let accelerateAmountY = this.acceleration.y * friction * tileMoveSpeedMultiplier / SETTINGS.TPS;

         // Make acceleration slow as the game object reaches its terminal velocity
         // Fix accelerating infinitely past terminal velocity
         const progressToTerminalVelocity = this.velocity.length() / terminalVelocity;
         if (progressToTerminalVelocity < 1) {
            accelerateAmountX *= 1 - Math.pow(progressToTerminalVelocity, 2);
            accelerateAmountY *= 1 - Math.pow(progressToTerminalVelocity, 2);
         }

         const amountBefore = this.velocity.length();
         const divideAmount = 1 + 3 / SETTINGS.TPS * TILE_FRICTIONS[this.tile.type];
         this.velocity.x /= divideAmount;
         this.velocity.y /= divideAmount;
         const tileFrictionReduceAmount = amountBefore - this.velocity.length();

         // Undo tile friction, but in the direction of acceleration instead of velocity
         const accelerateAmountLength = Math.sqrt(Math.pow(accelerateAmountX, 2) + Math.pow(accelerateAmountY, 2));
         accelerateAmountX += tileFrictionReduceAmount * accelerateAmountX / accelerateAmountLength;
         accelerateAmountY += tileFrictionReduceAmount * accelerateAmountY / accelerateAmountLength;

         const magnitudeBeforeAdd = this.velocity.length();
         
         // Add acceleration to velocity
         this.velocity.x += accelerateAmountX;
         this.velocity.y += accelerateAmountY;
         
         // Don't accelerate past terminal velocity
         // Allow the game object to 
         const velocityLength = this.velocity.length();
         if (velocityLength > terminalVelocity && velocityLength > magnitudeBeforeAdd) {
            if (magnitudeBeforeAdd < terminalVelocity) {
               this.velocity.x *= terminalVelocity / velocityLength;
               this.velocity.y *= terminalVelocity / velocityLength;
            } else {
               // If already exceeded terminal velocity, don't apply any velocity
               this.velocity.x *= magnitudeBeforeAdd / velocityLength;
               this.velocity.y *= magnitudeBeforeAdd / velocityLength;
            }
         }
      } else if (this.velocity.x !== 0 || this.velocity.y !== 0) {
         const divideAmount = 1 + 3 / SETTINGS.TPS * TILE_FRICTIONS[this.tile.type];
         this.velocity.x /= divideAmount;
         this.velocity.y /= divideAmount;

         // 
         // Apply friction
         // 

         const xSignBefore = Math.sign(this.velocity.x);
         
         const velocityLength = this.velocity.length();
         this.velocity.x = (velocityLength - 3) * this.velocity.x / velocityLength;
         this.velocity.y = (velocityLength - 3) * this.velocity.y / velocityLength;
         if (Math.sign(this.velocity.x) !== xSignBefore) {
            this.velocity.x = 0;
            this.velocity.y = 0;
         }
      }

      // If the game object is in a river, push them in the flow direction of the river
      const moveSpeedIsOverridden = typeof this.overrideTileMoveSpeedMultiplier !== "undefined" && this.overrideTileMoveSpeedMultiplier() !== null;
      if (this.isInRiver() && !moveSpeedIsOverridden) {
         const flowDirection = Board.getRiverFlowDirection(this.tile.x, this.tile.y);
         this.velocity.x += 240 / SETTINGS.TPS * Math.sin(flowDirection);
         this.velocity.y += 240 / SETTINGS.TPS * Math.cos(flowDirection);
      }

      // Apply velocity
      this.position.x += this.velocity.x / SETTINGS.TPS;
      this.position.y += this.velocity.y / SETTINGS.TPS;

      // @Cleanup: This may be incorrect to be done here
      this.resolveBorderCollisions();

      if (isNaN(this.position.x)) {
         throw new Error("Position was NaN.");
      }
   }

   protected resolveBorderCollisions(): void {
      if (this.position.x < 0) {
         this.position.x = 0;
      } else if (this.position.x >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE) {
         this.position.x = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE - 1;
      }
      if (this.position.y < 0) {
         this.position.y = 0;
      } else if (this.position.y >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE) {
         this.position.y = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE - 1;
      }
   }

   public updateCurrentTile(): void {
      const tileX = Math.floor(this.position.x / SETTINGS.TILE_SIZE);
      const tileY = Math.floor(this.position.y / SETTINGS.TILE_SIZE);
      this.tile = Board.getTile(tileX, tileY);
   }

   /** Recalculates which chunks the game object is contained in */
   public updateContainingChunks(): void {
      const containingChunks = new Set<Chunk>();
      
      // Find containing chunks
      for (const hitbox of this.hitboxes) {
         const minChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[0] / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[1] / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[2] / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[3] / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = Board.getChunk(chunkX, chunkY);
               containingChunks.add(chunk);
            }
         }
      }

      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!containingChunks.has(chunk)) {
            chunk.removeGameObject(this as unknown as GameObject);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addGameObject(this as unknown as GameObject);
            this.chunks.add(chunk);
         }
      }
   }

   public updateRenderPosition(): void {
      this.renderPosition.x = this.position.x + this.velocity.x * frameProgress / SETTINGS.TPS;
      this.renderPosition.y = this.position.y + this.velocity.y * frameProgress / SETTINGS.TPS;

      // Shake
      if (this.shakeAmount > 0) {
         const direction = 2 * Math.PI * Math.random();
         this.renderPosition.x += this.shakeAmount * Math.sin(direction);
         this.renderPosition.y += this.shakeAmount * Math.cos(direction);
      }
   }

   public updateHitboxes(): void {
      for (const hitbox of this.hitboxes) {
         hitbox.updateFromGameObject(this);
         hitbox.updateHitboxBounds(this.rotation);
      }
   }

   public updateFromData(data: GameObjectData): void {
      this.position.x = data.position[0];
      this.position.y = data.position[1];
      this.velocity.x = data.velocity[0];
      this.velocity.y = data.velocity[1];

      this.updateCurrentTile();

      this.rotation = data.rotation;
      this.mass = data.mass;
      this.ageTicks = data.ageTicks;

      const containingChunks = new Set<Chunk>();

      // Update the game object's hitboxes and containing chunks
      for (const hitbox of this.hitboxes) {
         hitbox.updateFromGameObject(this);
         hitbox.updateHitboxBounds(this.rotation);

         // Recalculate the game object's containing chunks based on the new hitbox bounds
         const minChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[0] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[1] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[2] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[3] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = Board.getChunk(chunkX, chunkY);
               if (!this.chunks.has(chunk)) {
                  chunk.addGameObject(this as unknown as GameObject);
                  this.chunks.add(chunk);
               }
               containingChunks.add(chunk);
            }
         }
      }

      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!containingChunks.has(chunk)) {
            chunk.removeGameObject(this as unknown as GameObject);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addGameObject(this as unknown as GameObject);
            this.chunks.add(chunk);
         }
      }
   }
}

export default GameObject;