import Entity from "./entities/Entity";
import { SETTINGS, Point, Vector, ServerTileUpdateData, rotatePoint } from "webgl-test-shared";
import Chunk from "./Chunk";
import ItemEntity from "./items/ItemEntity";
import { Tile } from "./Tile";
import RectangularHitbox from "./hitboxes/RectangularHitbox";

export type EntityHitboxInfo = {
   readonly vertexPositions: readonly [Point, Point, Point, Point];
   readonly sideAxes: ReadonlyArray<Vector>
}

class Board {
   private tiles: Array<Array<Tile>>;
   private chunks: Array<Array<Chunk>>;

   public entities: Record<number, Entity> = {};
   public itemEntities: Record<number, ItemEntity> = {};

   constructor(tiles: Array<Array<Tile>>) {
      this.tiles = tiles;
      
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

   public tickEntities(): void {
      for (const entity of Object.values(this.entities)) {
         entity.applyPhysics();
         if (typeof entity.tick !== "undefined") entity.tick();

         // Calculate the entity's new info
         for (const hitbox of entity.hitboxes) {
            if (hitbox.info.type === "rectangular") {
               (hitbox as RectangularHitbox).computeVertexPositions();
               (hitbox as RectangularHitbox).computeSideAxes();
            }
            hitbox.updateHitboxBounds();
            hitbox.updatePosition();
         }

         // Update the entities' containing chunks
         const newChunks = entity.calculateContainingChunks();
         entity.updateChunks(newChunks);
         entity.updateChunks(newChunks);
      }
   }

   public resolveCollisions(): void {
      for (const entity of Object.values(this.entities)) {
         entity.resolveEntityCollisions();
         entity.resolveWallCollisions();
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

   public removeEntity(entity: Entity): void {
      delete this.entities[entity.id];

      for (const chunk of entity.chunks) {
         chunk.removeEntity(entity);
      }
   }

   public calculateDistanceBetweenPointAndEntity(position: Point, entity: Entity): number {
      let minDist = Number.MAX_SAFE_INTEGER;
      for (const hitbox of entity.hitboxes) {
         let distance: number;
         switch (hitbox.info.type) {
            case "circular": {
               const dist = position.calculateDistanceBetween(entity.position);
               distance = dist - hitbox.info.radius;
               break;
            }
            case "rectangular": {
               // Rotate the objects to axis-align the rectangle
               const rotatedPositon = rotatePoint(position, entity.position, -entity.rotation);

               const distanceX = Math.max(Math.abs(rotatedPositon.x - entity.position.x) - hitbox.info.width / 2, 0);
               const distanceY = Math.max(Math.abs(rotatedPositon.y - entity.position.y) - hitbox.info.height / 2, 0);
               distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            }
         }
         if (distance < minDist) {
            minDist = distance;
         }
      }

      return minDist;
   }
}

export default Board;