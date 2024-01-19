import { EntityData, EntityType, HitData, HitFlags, Point, RIVER_STEPPING_STONE_SIZES, I_TPS, SETTINGS, StatusEffectData, TILE_FRICTIONS, TILE_MOVE_SPEED_MULTIPLIERS, TileType, distance, StatusEffect } from "webgl-test-shared";
import RenderPart, { RenderObject } from "./render-parts/RenderPart";
import Chunk from "./Chunk";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import { Tile } from "./Tile";
import CircularHitbox from "./hitboxes/CircularHitbox";
import Board from "./Board";
import Entity from "./entities/Entity";
import { createSlimePoolParticle, createWaterSplashParticle } from "./generic-particles";
import Camera from "./Camera";

let frameProgress = Number.EPSILON;
export function setFrameProgress(newFrameProgress: number): void {
   frameProgress = newFrameProgress;
}

export function getFrameProgress(): number {
   return frameProgress;
}

abstract class GameObject extends RenderObject {
   public readonly id: number;

   public readonly type: EntityType;

   public position: Point;
   public velocity = new Point(0, 0);
   public acceleration = new Point(0, 0);

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation = 0;

   public ageTicks = 0;

   public tile!: Tile;

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly allRenderParts = new Array<RenderPart>();

   public readonly hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   public readonly hitboxHalfDiagonalLength?: number;
   
   public chunks = new Set<Chunk>();

   /** Visual depth of the game object while being rendered */
   public readonly renderDepth: number;

   /** Amount the game object's render parts will shake */
   public shakeAmount = 0;

   public secondsSinceLastHit = 99999;

   public statusEffects = new Array<StatusEffectData>();

   constructor(position: Point, id: number, type: EntityType, renderDepth: number) {
      super();
      
      this.position = position;
      this.renderPosition.x = position.x;
      this.renderPosition.y = position.y;
      this.id = id;
      this.type = type;
      this.renderDepth = renderDepth;

      this.updateCurrentTile();

      // Note: The chunks are calculated outside of the constructor immediately after the game object is created
      // so that all constructors have time to run
   }
   
   public attachRenderPart(renderPart: RenderPart): void {
      // Don't add if already attached
      if (this.allRenderParts.indexOf(renderPart) !== -1) {
         return;
      }

      Board.numVisibleRenderParts++;
      
      // Add to the root array
      let idx = this.allRenderParts.length;
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const currentRenderPart = this.allRenderParts[i];
         if (renderPart.zIndex < currentRenderPart.zIndex) {
            idx = i;
            break;
         }
      }
      this.allRenderParts.splice(idx, 0, renderPart);
   }

   public removeRenderPart(renderPart: RenderPart): void {
      // Don't remove if already removed
      const idx = this.allRenderParts.indexOf(renderPart);
      if (idx === -1) {
         return;
      }
      
      Board.numVisibleRenderParts--;
      
      // Remove from the root array
      this.allRenderParts.splice(this.allRenderParts.indexOf(renderPart), 1);
   }

   public hasStatusEffect(type: StatusEffect): boolean {
      for (const statusEffect of this.statusEffects) {
         if (statusEffect.type === type) {
            return true;
         }
      }
      return false;
   }

   public getStatusEffect(type: StatusEffect): StatusEffectData | null {
      for (const statusEffect of this.statusEffects) {
         if (statusEffect.type === type) {
            return statusEffect;
         }
      }
      return null;
   }

   public addCircularHitbox(hitbox: CircularHitbox): void {
      this.hitboxes.push(hitbox);
      hitbox.updateFromGameObject(this);
      hitbox.updateHitboxBounds();
   }

   public addRectangularHitbox(hitbox: RectangularHitbox): void {
      this.hitboxes.push(hitbox);
      hitbox.updateFromGameObject(this);
      hitbox.updateHitboxBounds(this.rotation);
   }

   public onRemove?(): void;

   protected overrideTileMoveSpeedMultiplier?(): number | null;

   public tick(): void {
      this.tintR = 0;
      this.tintG = 0;
      this.tintB = 0;
      
      // Water droplet particles
      // @Cleanup: Don't hardcode fish condition
      if (this.isInRiver() && Board.tickIntervalHasPassed(0.05) && (!(this instanceof Entity) || this.type !== EntityType.fish)) {
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
      // Apply acceleration
      if (this.acceleration.x !== 0 || this.acceleration.y !== 0) {
         let tileMoveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[this.tile.type];
         if (this.tile.type === TileType.water && !this.isInRiver()) {
            tileMoveSpeedMultiplier = 1;
         }

         const friction = TILE_FRICTIONS[this.tile.type];
         
         this.velocity.x += this.acceleration.x * friction * tileMoveSpeedMultiplier * I_TPS;
         this.velocity.y += this.acceleration.y * friction * tileMoveSpeedMultiplier * I_TPS;
      }

      // If the game object is in a river, push them in the flow direction of the river
      const moveSpeedIsOverridden = typeof this.overrideTileMoveSpeedMultiplier !== "undefined" && this.overrideTileMoveSpeedMultiplier() !== null;
      if (this.isInRiver() && !moveSpeedIsOverridden) {
         const flowDirection = Board.getRiverFlowDirection(this.tile.x, this.tile.y);
         this.velocity.x += 240 / SETTINGS.TPS * Math.sin(flowDirection);
         this.velocity.y += 240 / SETTINGS.TPS * Math.cos(flowDirection);
      }

      // Apply velocity
      if (this.velocity.x !== 0 || this.velocity.y !== 0) {
         const friction = TILE_FRICTIONS[this.tile.type];

         // Apply a friction based on the tile type to simulate air resistance (???)
         this.velocity.x *= 1 - friction * I_TPS * 2;
         this.velocity.y *= 1 - friction * I_TPS * 2;

         // Apply a constant friction based on the tile type to simulate ground friction
         const velocityMagnitude = this.velocity.length();
         if (velocityMagnitude > 0) {
            const groundFriction = Math.min(friction, velocityMagnitude);
            this.velocity.x -= groundFriction * this.velocity.x / velocityMagnitude;
            this.velocity.y -= groundFriction * this.velocity.y / velocityMagnitude;
         }
         
         this.position.x += this.velocity.x * I_TPS;
         this.position.y += this.velocity.y * I_TPS;
      }

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

   public updateFromData(data: EntityData): void {
      this.position.x = data.position[0];
      this.position.y = data.position[1];
      this.velocity.x = data.velocity[0];
      this.velocity.y = data.velocity[1];

      this.updateCurrentTile();

      this.rotation = data.rotation;
      this.ageTicks = data.ageTicks;

      // @Speed
      // @Speed
      // @Speed

      const containingChunks = new Set<Chunk>();

      for (const hitboxData of data.circularHitboxes) {
         let existingHitboxIndex = -1;
         for (let i = 0; i < this.hitboxes.length; i++) {
            const hitbox = this.hitboxes[i];
            if (hitbox.localID === hitboxData.localID) {
               existingHitboxIndex = i;
               break;
            }
         }

         let hitbox: CircularHitbox;
         if (existingHitboxIndex === -1) {
            hitbox = new CircularHitbox(hitboxData.mass, hitboxData.radius, hitboxData.localID);
            hitbox.offset.x = hitboxData.offsetX;
            hitbox.offset.y = hitboxData.offsetY;
            this.addCircularHitbox(hitbox);
         } else {
            hitbox = this.hitboxes[existingHitboxIndex] as CircularHitbox;
            hitbox.offset.x = hitboxData.offsetX;
            hitbox.offset.y = hitboxData.offsetY;
            hitbox.updateFromGameObject(this);
         }

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
      for (const hitboxData of data.rectangularHitboxes) {
         let existingHitboxIndex = -1;
         for (let i = 0; i < this.hitboxes.length; i++) {
            const hitbox = this.hitboxes[i];
            if (hitbox.localID === hitboxData.localID) {
               existingHitboxIndex = i;
               break;
            }
         }

         let hitbox: RectangularHitbox;
         if (existingHitboxIndex === -1) {
            hitbox = new RectangularHitbox(hitboxData.mass, hitboxData.width, hitboxData.height, hitboxData.localID);
            hitbox.offset.x = hitboxData.offsetX;
            hitbox.offset.y = hitboxData.offsetY;
            this.addRectangularHitbox(hitbox);
         } else {
            hitbox = this.hitboxes[existingHitboxIndex] as RectangularHitbox;
            hitbox.offset.x = hitboxData.offsetX;
            hitbox.offset.y = hitboxData.offsetY;
            hitbox.updateFromGameObject(this);
         }

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

   // @Cleanup: Should this be here
   public isVisible(): boolean {
      for (const chunk of this.chunks) {
         if (chunk.x >= Camera.minVisibleChunkX && chunk.x <= Camera.maxVisibleChunkX && chunk.y >= Camera.minVisibleChunkY && chunk.y <= Camera.maxVisibleChunkY) {
            return true;
         }
      }
      return false;
   }

   public onDie?(): void;

   protected onHit?(hitData: HitData): void;

   public registerHit(hitData: HitData): void {
      // If the entity is hit by a flesh sword, create slime puddles
      if (hitData.flags & HitFlags.HIT_BY_FLESH_SWORD) {
         for (let i = 0; i < 2; i++) {
            createSlimePoolParticle(this.position.x, this.position.y, 32);
         }
      }
      
      if (typeof this.onHit !== "undefined") {
         this.onHit(hitData);
      }

      this.secondsSinceLastHit = 0;
   }
}

export default GameObject;