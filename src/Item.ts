import { BaseItemInfo, ItemID, ITEM_INFO_RECORD, Point } from "webgl-test-shared";
import Chunk from "./Chunk";
import Game from "./Game";

class Item implements BaseItemInfo {
   public readonly id: number;

   public readonly position: Point;
   /** Containing chunks */
   public readonly chunks: ReadonlyArray<Chunk>;
   public count: number;

   public readonly rotation: number;

   public readonly itemID: ItemID;
   public readonly name: string;

   constructor(id: number, position: Point, containingChunks: ReadonlyArray<Chunk>, itemID: ItemID, count: number, rotation: number) {
      this.id = id;
      this.position = position;
      this.count = count;
      this.itemID = itemID;

      this.rotation = rotation;

      const itemInfo = ITEM_INFO_RECORD[itemID];
      this.name = itemInfo.name;

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

export default Item;