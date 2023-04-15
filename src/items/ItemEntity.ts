import { BaseItemInfo, ItemType, Point, ItemEntityData, Vector } from "webgl-test-shared";
import Chunk from "../Chunk";
import Game from "../Game";

class ItemEntity implements BaseItemInfo {
   public readonly id: number;

   public position: Point;
   public velocity: Vector | null = null;

   /** Chunks which contain the item entity */
   public chunks: Set<Chunk>;

   public readonly rotation: number;

   public readonly type: ItemType;

   constructor(id: number, position: Point, velocity: Vector | null, containingChunks: Set<Chunk>, itemType: ItemType, rotation: number) {
      this.id = id;
      this.position = position;
      this.velocity = velocity;
      this.type = itemType;

      this.rotation = rotation;

      // Add to containing chunks
      this.chunks = containingChunks;
      for (const chunk of this.chunks) {
         chunk.addItem(this);
      }

      Game.board.itemEntities[this.id] = this;
   }

   public remove(): void {
      for (const chunk of this.chunks) {
         chunk.removeItem(this);
      }

      delete Game.board.itemEntities[this.id];
   }

   public updateFromData(data: ItemEntityData): void {
      this.position = Point.unpackage(data.position);
      this.velocity = data.velocity !== null ? Vector.unpackage(data.velocity) : null;

      const knownChunks = new Set(this.chunks);

      this.chunks = new Set<Chunk>();
      for (const [chunkX, chunkY] of data.chunkCoordinates) {
         const chunk = Game.board.getChunk(chunkX, chunkY);

         if (!knownChunks.has(chunk)) {
            this.chunks.add(chunk);
         } else {
            knownChunks.delete(chunk);
         }
      }

      for (const chunk of knownChunks) {
         chunk.removeItem(this);
      }
   }
}

export default ItemEntity;