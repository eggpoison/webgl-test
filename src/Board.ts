import Entity from "./entities/Entity";
import { SETTINGS, Point, Vector, ServerTileUpdateData, rotatePoint, WaterRockData } from "webgl-test-shared";
import Chunk from "./Chunk";
import DroppedItem from "./items/DroppedItem";
import { Tile } from "./Tile";
import GameObject from "./GameObject";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import Projectile from "./projectiles/Projectile";
import Particle from "./Particle";

export type EntityHitboxInfo = {
   readonly vertexPositions: readonly [Point, Point, Point, Point];
   readonly sideAxes: ReadonlyArray<Vector>
}

class Board {
   private readonly tiles: Array<Array<Tile>>;
   private readonly chunks: Array<Array<Chunk>>;

   public readonly waterRocks: ReadonlyArray<WaterRockData>;

   public gameObjects: Record<number, GameObject> = {};
   public entities: Record<number, Entity> = {};
   public droppedItems: Record<number, DroppedItem> = {};
   public projectiles: Record<number, Projectile> = {};

   public particles: Record<number, Particle> = {};

   constructor(tiles: Array<Array<Tile>>, waterRocks: ReadonlyArray<WaterRockData>) {
      this.tiles = tiles;
      this.waterRocks = waterRocks;
      
      // Create the chunk array
      this.chunks = new Array<Array<Chunk>>();
      for (let x = 0; x < SETTINGS.BOARD_SIZE; x++) {
         this.chunks[x] = new Array<Chunk>();
         for (let y = 0; y < SETTINGS.BOARD_SIZE; y++) {
            this.chunks[x][y] = new Chunk(x, y);
         }
      }
   }

   public getTile(tileX: number, tileY: number): Tile {
      if (tileX < 0 || tileX >= SETTINGS.BOARD_DIMENSIONS) throw new Error(`Tile x coordinate '${tileX}' is not a valid tile coordinate.`);
      if (tileY < 0 || tileY >= SETTINGS.BOARD_DIMENSIONS) throw new Error(`Tile x coordinate '${tileY}' is not a valid tile coordinate.`);
      return this.tiles[tileX][tileY];
   }

   public getChunk(x: number, y: number): Chunk {
      return this.chunks[x][y];
   }

   public updateGameObjects(): void {
      for (const gameObject of Object.values(this.gameObjects)) {
         gameObject.applyPhysics();
         if (typeof gameObject.tick !== "undefined") gameObject.tick();

         // Calculate the entity's new info
         for (const hitbox of gameObject.hitboxes) {
            if (hitbox.info.type === "rectangular") {
               (hitbox as RectangularHitbox).computeVertexPositions();
               (hitbox as RectangularHitbox).computeSideAxes();
            }
            hitbox.updateHitboxBounds();
            hitbox.updatePosition();
         }

         // Update the entities' containing chunks
         const newChunks = gameObject.calculateContainingChunks();
         gameObject.updateChunks(newChunks);
      }
   }

   /** Updates the client's copy of the tiles array to match any tile updates that have occurred */
   public loadTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const update of tileUpdates) {
         let tile = this.getTile(update.x, update.y);
         tile.type = update.type;
         tile.isWall = update.isWall;
      }
   }

   public removeGameObject(gameObject: GameObject): void {
      if (typeof gameObject === "undefined") {
         throw new Error("Tried to remove an undefined game object.");
      }

      if (typeof gameObject.remove !== "undefined") {
         gameObject.remove();
      }

      for (const chunk of gameObject.chunks) {
         chunk.removeGameObject(gameObject);
      }

      delete this.gameObjects[gameObject.id];
   }

   public calculateDistanceBetweenPointAndGameObject(position: Point, gameObject: GameObject): number {
      let minDist = Number.MAX_SAFE_INTEGER;
      for (const hitbox of gameObject.hitboxes) {
         let distance: number;
         switch (hitbox.info.type) {
            case "circular": {
               const dist = position.calculateDistanceBetween(gameObject.position);
               distance = dist - hitbox.info.radius;
               break;
            }
            case "rectangular": {
               // Rotate the objects to axis-align the rectangle
               const rotatedPositon = rotatePoint(position, gameObject.position, -gameObject.rotation);

               const distanceX = Math.max(Math.abs(rotatedPositon.x - gameObject.position.x) - hitbox.info.width / 2, 0);
               const distanceY = Math.max(Math.abs(rotatedPositon.y - gameObject.position.y) - hitbox.info.height / 2, 0);
               distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            }
         }
         if (distance < minDist) {
            minDist = distance;
         }
      }

      return minDist;
   }

   public tileIsInBoard(tileX: number, tileY: number): boolean {
      return tileX >= 0 && tileX < SETTINGS.BOARD_DIMENSIONS && tileY >= 0 && tileY < SETTINGS.BOARD_DIMENSIONS;
   }
}

export default Board;