import { BaseItemInfo, ItemType, Point } from "webgl-test-shared";
import Chunk from "./Chunk";
import Game from "./Game";

class ItemEntity implements BaseItemInfo {
   public readonly id: number;

   public readonly position: Point;
   /** Chunks which contain the item entity */
   public readonly chunks: ReadonlyArray<Chunk>;

   public readonly rotation: number;

   public readonly type: ItemType;

   constructor(id: number, position: Point, containingChunks: ReadonlyArray<Chunk>, itemType: ItemType, rotation: number) {
      this.id = id;
      this.position = position;
      this.type = itemType;

      this.rotation = rotation;

      // Add to containing chunks
      this.chunks = containingChunks;
      for (const chunk of this.chunks) {
         chunk.addItem(this);
      }

      Game.board.items[this.id] = this;
   }

   public remove(): void {
      for (const chunk of this.chunks) {
         chunk.removeItem(this);
      }

      delete Game.board.items[this.id];
   }
}

export default ItemEntity;