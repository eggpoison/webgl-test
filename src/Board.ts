import Entity from "./entities/Entity";
import { SETTINGS, Point, Vector, ServerTileUpdateData, rotatePoint, WaterRockData, RiverSteppingStoneData, RIVER_STEPPING_STONE_SIZES, EntityType, ServerTileData, GrassTileInfo, DecorationInfo } from "webgl-test-shared";
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
import Player from "./entities/Player";
import Fish from "./entities/Fish";

export interface EntityHitboxInfo {
   readonly vertexPositions: readonly [Point, Point, Point, Point];
   readonly sideAxes: ReadonlyArray<Vector>;
}

interface TickCallback {
   time: number;
   readonly callback: () => void;
}

export interface Light {
   readonly position: Point;
   /** Number of tiles which the light extends from */
   strength: number;
   radius: number;
}

abstract class Board {
   public static ticks: number;
   public static time: number;

   private static tiles: Array<Array<Tile>>;
   private static chunks: Array<Array<Chunk>>;

   public static edgeTiles: Record<number, Record<number, Tile>> = {};
   public static edgeRiverFlowDirections: Record<number, Record<number, number>>; 

   public static grassInfo: Record<number, Record<number, GrassTileInfo>>;

   // @Cleanup: This is only used to fill the render chunks with decorations, doesn't
   // need to stick around for the entirety of the game's duration
   public static decorations: ReadonlyArray<DecorationInfo>;
   // @Cleanup: This is only used to fill the render chunks with water rocks, doesn't
   // need to stick around for the entirety of the game's duration
   public static waterRocks: ReadonlyArray<WaterRockData>;
   // @Cleanup: This is only used to fill the render chunks with edge stepping stones, doesn't
   // need to stick around for the entirety of the game's duration
   public static edgeRiverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;
   
   public static numVisibleRenderParts = 0;
   /** Game objects sorted in descending render weight */
   public static readonly sortedGameObjects = new Array<GameObject>();
   /** All fish in the board */
   public static readonly fish = new Array<Fish>();

   public static readonly gameObjects = new Set<GameObject>();
   public static readonly entities: Record<number, Entity> = {};
   public static readonly droppedItems: Record<number, DroppedItem> = {};
   public static readonly projectiles: Record<number, Projectile> = {};

   /** Stores all player entities in the game. Necessary for rendering their names. */
   public static readonly players = new Array<Player>();

   // @Cleanup This is too messy. Perhaps combine all into one
   // public static readonly particles = new Array<Particle>();
   public static readonly lowMonocolourParticles = new Array<Particle>();
   public static readonly lowTexturedParticles = new Array<Particle>();
   public static readonly highMonocolourParticles = new Array<Particle>();
   public static readonly highTexturedParticles = new Array<Particle>();
   /** Stores the IDs of all particles sent by the server */
   public static readonly serverParticleIDs = new Set<number>();

   private static riverFlowDirections: Record<number, Record<number, number>>;

   private static tickCallbacks = new Array<TickCallback>();

   public static lights = new Array<Light>();

   // @Cleanup: This function gets called by Game.ts, which gets called by LoadingScreen.tsx, with these same parameters. This feels unnecessary.
   public static initialise(tiles: Array<Array<Tile>>, waterRocks: ReadonlyArray<WaterRockData>, riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>, riverFlowDirections: Record<number, Record<number, number>>, edgeTiles: Array<ServerTileData>, edgeRiverFlowDirections: Record<number, Record<number, number>>, edgeRiverSteppingStones: ReadonlyArray<RiverSteppingStoneData>, grassInfo: Record<number, Record<number, GrassTileInfo>>, decorations: ReadonlyArray<DecorationInfo>): void {
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
      this.edgeRiverFlowDirections = edgeRiverFlowDirections;
      this.edgeRiverSteppingStones = edgeRiverSteppingStones;

      this.waterRocks = waterRocks;

      // Add river stepping stones to chunks
      for (const steppingStone of riverSteppingStones) {
         const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];

         const minChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX - size/2) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX + size/2) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY - size/2) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY + size/2) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = this.getChunk(chunkX, chunkY);
               chunk.riverSteppingStones.push(steppingStone);
            }
         }
      }

      for (const tileData of edgeTiles) {
         if (!this.edgeTiles.hasOwnProperty(tileData.x)) {
            this.edgeTiles[tileData.x] = {};
         }
         this.edgeTiles[tileData.x][tileData.y] = new Tile(tileData.x, tileData.y, tileData.type, tileData.biomeName, tileData.isWall);
      }

      this.grassInfo = grassInfo;
      this.decorations = decorations;
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
      if (entity.type === EntityType.fish) {
         this.gameObjects.add(entity);
         this.fish.push(entity as Fish);
         this.entities[entity.id] = entity;
      } else {
         this.addGameObject(entity);
         this.entities[entity.id] = entity;
      }
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
      this.gameObjects.add(gameObject);
      
      // Add into the sorted array
      let idx = this.sortedGameObjects.length;
      for (let i = 0; i < this.sortedGameObjects.length; i++) {
         const currentGameObject = this.sortedGameObjects[i];
         if (gameObject.renderDepth > currentGameObject.renderDepth) {
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
   
      if (typeof gameObject.onRemove !== "undefined") {
         gameObject.onRemove();
      }

      this.gameObjects.delete(gameObject);
      if (gameObject instanceof Entity && gameObject.type === EntityType.fish) {
         const idx = this.fish.indexOf(gameObject as Fish);
         if (idx !== -1) {
            this.fish.splice(idx, 1);
         }
      } else {
         this.sortedGameObjects.splice(this.sortedGameObjects.indexOf(gameObject), 1);
      }
   
      this.numVisibleRenderParts -= gameObject.allRenderParts.length;
   }

   public static getRiverFlowDirection(tileX: number, tileY: number): number {
      if (!this.riverFlowDirections.hasOwnProperty(tileX) || !this.riverFlowDirections[tileX].hasOwnProperty(tileY)) {
         throw new Error("Tried to get the river flow direction of a non-water tile.");
      }
      
      return this.riverFlowDirections[tileX][tileY];
   }

   public static getEdgeRiverFlowDirection(tileX: number, tileY: number): number {
      if (this.riverFlowDirections.hasOwnProperty(tileX) && this.riverFlowDirections[tileX].hasOwnProperty(tileY)) {
         return this.riverFlowDirections[tileX][tileY];
      } else if (this.edgeRiverFlowDirections.hasOwnProperty(tileX) && this.edgeRiverFlowDirections[tileX].hasOwnProperty(tileY)) {
         return this.edgeRiverFlowDirections[tileX][tileY];
      }
      throw new Error("Tried to get the river flow direction of a non-water tile.");
   }

   public static getTile(tileX: number, tileY: number): Tile {
      if (tileX < 0 || tileX >= SETTINGS.BOARD_DIMENSIONS) throw new Error(`Tile x coordinate '${tileX}' is not a valid tile coordinate.`);
      if (tileY < 0 || tileY >= SETTINGS.BOARD_DIMENSIONS) throw new Error(`Tile x coordinate '${tileY}' is not a valid tile coordinate.`);
      return this.tiles[tileX][tileY];
   }

   public static tileIsWithinEdge(tileX: number, tileY: number): boolean {
      return tileX >= -SETTINGS.EDGE_GENERATION_DISTANCE && tileX < SETTINGS.BOARD_DIMENSIONS + SETTINGS.EDGE_GENERATION_DISTANCE && tileY >= -SETTINGS.EDGE_GENERATION_DISTANCE && tileY < SETTINGS.BOARD_DIMENSIONS + SETTINGS.EDGE_GENERATION_DISTANCE;
   }

   public static getEdgeTile(tileX: number, tileY: number): Tile | null {
      if (tileX >= 0 && tileX < SETTINGS.BOARD_DIMENSIONS && tileY >= 0 && tileY < SETTINGS.BOARD_DIMENSIONS) {
         return this.getTile(tileX, tileY);
      } else {
         if (!this.edgeTiles.hasOwnProperty(tileX) || !this.edgeTiles[tileX].hasOwnProperty(tileY)) {
            return null;
         }
         return this.edgeTiles[tileX][tileY];
      }
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

      // bufferContainer.pushBufferData(10);
      // bufferContainer.pushBufferData(11);
   }

   public static updateParticles(): void {
      this.updateParticleArray(this.lowMonocolourParticles, lowMonocolourBufferContainer);
      this.updateParticleArray(this.lowTexturedParticles, lowTexturedBufferContainer);
      this.updateParticleArray(this.highMonocolourParticles, highMonocolourBufferContainer);
      this.updateParticleArray(this.highTexturedParticles, highTexturedBufferContainer);
   }

   /** Ticks all game objects without updating them */
   public static tickGameObjects(): void {
      for (const gameObject of this.gameObjects) {
         gameObject.tick();
      }
   }

   public static updateGameObjects(): void {
      for (const gameObject of this.gameObjects) {
         gameObject.applyPhysics();
         gameObject.updateCurrentTile();
         gameObject.tick();

         // Calculate the entity's new info
         for (const hitbox of gameObject.hitboxes) {
            hitbox.updateFromGameObject(gameObject);
            hitbox.updateHitboxBounds(gameObject.rotation);
         }

         gameObject.updateContainingChunks();
      }
   }

   /** Updates the client's copy of the tiles array to match any tile updates that have occurred */
   public static loadTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const update of tileUpdates) {
         const tileX = update.tileIndex % SETTINGS.BOARD_DIMENSIONS;
         const tileY = Math.floor(update.tileIndex / SETTINGS.BOARD_DIMENSIONS);
         
         let tile = this.getTile(tileX, tileY);
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

   public static hasGameObjectID(gameObjectID: number): boolean {
      if (this.entities.hasOwnProperty(gameObjectID)) {
         return true;
      }
      if (this.droppedItems.hasOwnProperty(gameObjectID)) {
         return true;
      }
      if (this.projectiles.hasOwnProperty(gameObjectID)) {
         return true;
      }
      return false;
   }
}

export default Board;