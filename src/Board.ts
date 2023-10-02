import Entity from "./entities/Entity";
import { SETTINGS, Point, Vector, ServerTileUpdateData, rotatePoint, WaterRockData, RiverSteppingStoneData, RiverSteppingStoneSize, RIVER_STEPPING_STONE_SIZES } from "webgl-test-shared";
import Chunk from "./Chunk";
import DroppedItem from "./items/DroppedItem";
import { Tile } from "./Tile";
import GameObject from "./GameObject";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import Projectile from "./projectiles/Projectile";
import Particle from "./Particle";
import CircularHitbox from "./hitboxes/CircularHitbox";
import { highMonocolourBufferContainer, highTexturedBufferContainer, lowMonocolourBufferContainer, lowTexturedBufferContainer } from "./rendering/particle-rendering";
import ObjectBufferContainer from "./rendering/ObjectBufferContainer";
import { tempFloat32ArrayLength1 } from "./webgl";

export interface EntityHitboxInfo {
   readonly vertexPositions: readonly [Point, Point, Point, Point];
   readonly sideAxes: ReadonlyArray<Vector>;
}

export interface RiverSteppingStone {
   readonly position: Point;
   readonly rotation: number;
   readonly size: RiverSteppingStoneSize;
}

interface TickCallback {
   time: number;
   readonly callback: () => void;
}

abstract class Board {
   public static ticks: number;
   public static time: number;

   private static tiles: Array<Array<Tile>>;
   private static chunks: Array<Array<Chunk>>;

   /** Game objects sorted in descending render weight */
   public static readonly sortedGameObjects = new Array<GameObject>();

   public static readonly gameObjects: Record<number, GameObject> = {};
   public static readonly entities: Record<number, Entity> = {};
   public static readonly droppedItems: Record<number, DroppedItem> = {};
   public static readonly projectiles: Record<number, Projectile> = {};

   // @Cleanup This is too messy
   public static readonly lowMonocolourParticles = new Array<Particle>();
   public static readonly lowTexturedParticles = new Array<Particle>();
   public static readonly highMonocolourParticles = new Array<Particle>();
   public static readonly highTexturedParticles = new Array<Particle>();
   /** Stores the IDs of all particles sent by the server */
   public static readonly serverParticleIDs = new Set<number>();

   private static riverFlowDirections: Record<number, Record<number, number>>;

   private static tickCallbacks = new Array<TickCallback>();

   public static initialise(tiles: Array<Array<Tile>>, waterRocks: ReadonlyArray<WaterRockData>, riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>, riverFlowDirections: Record<number, Record<number, number>>): void {
      this.tiles = tiles;
      
      // Create the chunk array
      this.chunks = new Array<Array<Chunk>>();
      for (let x = 0; x < SETTINGS.BOARD_SIZE; x++) {
         this.chunks[x] = new Array<Chunk>();
         for (let y = 0; y < SETTINGS.BOARD_SIZE; y++) {
            this.chunks[x][y] = new Chunk(x, y);
         }
      }

      this.riverFlowDirections = riverFlowDirections;

      // Add water rocks to chunks
      for (const waterRock of waterRocks) {
         const chunkX = Math.floor(waterRock.position[0] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE);
         const chunkY = Math.floor(waterRock.position[1] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE);
         const chunk = this.chunks[chunkX][chunkY];
         chunk.waterRocks.push(waterRock);
      }

      // Add river stepping stones to chunks
      for (const steppingStoneData of riverSteppingStones) {
         // Create the client-side information for the stepping stone
         const steppingStone: RiverSteppingStone = {
            position: Point.unpackage(steppingStoneData.position),
            rotation: steppingStoneData.rotation,
            size: steppingStoneData.size
         };

         const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];

         const minChunkX = Math.max(Math.min(Math.floor((steppingStone.position.x - size/2) / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor((steppingStone.position.x + size/2) / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor((steppingStone.position.y - size/2) / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor((steppingStone.position.y + size/2) / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = this.getChunk(chunkX, chunkY);
               chunk.riverSteppingStones.push(steppingStone);
            }
         }
      }
   }

   public static addTickCallback(time: number, callback: () => void): void {
      this.tickCallbacks.push({
         time: time,
         callback: callback
      });
   }

   public static updateTickCallbacks(): void {
      for (let i = this.tickCallbacks.length - 1; i >= 0; i--) {
         const tickCallbackInfo = this.tickCallbacks[i];
         tickCallbackInfo.time -= 1 / SETTINGS.TPS;
         if (tickCallbackInfo.time <= 0) {
            tickCallbackInfo.callback();
            this.tickCallbacks.splice(i, 1);
         }
      }
   }

   public static tickIntervalHasPassed(intervalSeconds: number): boolean {
      const ticksPerInterval = intervalSeconds * SETTINGS.TPS;
      
      const previousCheck = (Board.ticks - 1) / ticksPerInterval;
      const check = Board.ticks / ticksPerInterval;
      return Math.floor(previousCheck) !== Math.floor(check);
   }

   public static addEntity(entity: Entity): void {
      this.addGameObject(entity);
      this.entities[entity.id] = entity;
   }

   public static addDroppedItem(droppedItem: DroppedItem): void {
      this.addGameObject(droppedItem);
      this.droppedItems[droppedItem.id] = droppedItem;
   }

   public static addProjectile(projectile: Projectile): void {
      this.addGameObject(projectile);
      this.projectiles[projectile.id] = projectile;
   }

   private static addGameObject(gameObject: GameObject): void {
      this.gameObjects[gameObject.id] = gameObject;
      gameObject.updateContainingChunks();
      
      // Add into the sorted array
      let idx = this.sortedGameObjects.length;
      for (let i = 0; i < this.sortedGameObjects.length; i++) {
         const currentGameObject = this.sortedGameObjects[i];
         if (gameObject.renderWeight > currentGameObject.renderWeight) {
            idx = i;
            break;
         }
      }
      this.sortedGameObjects.splice(idx, 0, gameObject);
   }

   public static removeGameObject(gameObject: GameObject): void {
      if (typeof gameObject === "undefined") {
         throw new Error("Tried to remove an undefined game object.");
      }

      for (const chunk of gameObject.chunks) {
         chunk.removeGameObject(gameObject);
      }

      // @Speed
      delete this.gameObjects[gameObject.id];
      delete this.projectiles[gameObject.id];
      delete this.entities[gameObject.id];
      delete this.droppedItems[gameObject.id];

      if (typeof gameObject.onRemove !== "undefined") {
         gameObject.onRemove();
      }

      this.sortedGameObjects.splice(this.sortedGameObjects.indexOf(gameObject), 1);
   }

   public static getRiverFlowDirection(tileX: number, tileY: number): number {
      if (!this.riverFlowDirections.hasOwnProperty(tileX) || !this.riverFlowDirections[tileX].hasOwnProperty(tileY)) {
         throw new Error("Tried to get the river flow direction of a non-water tile.");
      }
      
      return this.riverFlowDirections[tileX][tileY];
   }

   public static getTile(tileX: number, tileY: number): Tile {
      if (tileX < 0 || tileX >= SETTINGS.BOARD_DIMENSIONS) throw new Error(`Tile x coordinate '${tileX}' is not a valid tile coordinate.`);
      if (tileY < 0 || tileY >= SETTINGS.BOARD_DIMENSIONS) throw new Error(`Tile x coordinate '${tileY}' is not a valid tile coordinate.`);
      return this.tiles[tileX][tileY];
   }

   public static getChunk(x: number, y: number): Chunk {
      return this.chunks[x][y];
   }

   private static updateParticleArray(particles: Array<Particle>, bufferContainer: ObjectBufferContainer): void {
      const removedParticleIndexes = new Array<number>();
      for (let i = 0; i < particles.length; i++) {
         const particle = particles[i];

         particle.age += 1 / SETTINGS.TPS;
         if (particle.age >= particle.lifetime) {
            removedParticleIndexes.push(i);
         } else {
            // Update opacity
            if (typeof particle.getOpacity !== "undefined") {
               const opacity = particle.getOpacity();
               tempFloat32ArrayLength1[0] = opacity;
               bufferContainer.setData(particle.id, 10, tempFloat32ArrayLength1);
            }
            // Update scale
            if (typeof particle.getScale !== "undefined") {
               const scale = particle.getScale();
               tempFloat32ArrayLength1[0] = scale;
               bufferContainer.setData(particle.id, 11, tempFloat32ArrayLength1);
            }
         }
      }

      // Remove removed particles
      for (let i = removedParticleIndexes.length - 1; i >= 0; i--) {
         const idx = removedParticleIndexes[i];
         const particle = particles[idx];

         bufferContainer.removeObject(particle.id);
         particles.splice(idx, 1);
      }
   }

   public static updateParticles(): void {
      this.updateParticleArray(this.lowMonocolourParticles, lowMonocolourBufferContainer);
      this.updateParticleArray(this.lowTexturedParticles, lowTexturedBufferContainer);
      this.updateParticleArray(this.highMonocolourParticles, highMonocolourBufferContainer);
      this.updateParticleArray(this.highTexturedParticles, highTexturedBufferContainer);
   }

   /** Ticks all game objects without updating them */
   public static tickGameObjects(): void {
      for (const gameObject of Object.values(this.gameObjects)) {
         if (typeof gameObject.tick !== "undefined") {
            gameObject.tick();
         }
      }
   }

   public static updateGameObjects(): void {
      for (const gameObject of Object.values(this.gameObjects)) {
         gameObject.applyPhysics();
         if (typeof gameObject.tick !== "undefined") gameObject.tick();

         // Calculate the entity's new info
         for (const hitbox of gameObject.hitboxes) {
            hitbox.updateHitboxBounds();
            hitbox.updatePosition();
         }

         gameObject.updateContainingChunks();
      }
   }

   /** Updates the client's copy of the tiles array to match any tile updates that have occurred */
   public static loadTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const update of tileUpdates) {
         let tile = this.getTile(update.x, update.y);
         tile.type = update.type;
         tile.isWall = update.isWall;
      }
   }

   public static calculateDistanceBetweenPointAndGameObject(position: Point, gameObject: GameObject): number {
      let minDist = Number.MAX_SAFE_INTEGER;
      for (const hitbox of gameObject.hitboxes) {
         let distance: number;
         if (hitbox.hasOwnProperty("radius")) {
            // Circular
            const dist = position.calculateDistanceBetween(gameObject.position);
            distance = dist - (hitbox as CircularHitbox).radius;
         } else {
            // Rectangular

            // Rotate the objects to axis-align the rectangle
            const rotatedPositon = rotatePoint(position, gameObject.position, -gameObject.rotation);

            const distanceX = Math.max(Math.abs(rotatedPositon.x - gameObject.position.x) - (hitbox as RectangularHitbox).width / 2, 0);
            const distanceY = Math.max(Math.abs(rotatedPositon.y - gameObject.position.y) - (hitbox as RectangularHitbox).height / 2, 0);
            distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
         }
         if (distance < minDist) {
            minDist = distance;
         }
      }

      return minDist;
   }

   public static tileIsInBoard(tileX: number, tileY: number): boolean {
      return tileX >= 0 && tileX < SETTINGS.BOARD_DIMENSIONS && tileY >= 0 && tileY < SETTINGS.BOARD_DIMENSIONS;
   }
}

export default Board;