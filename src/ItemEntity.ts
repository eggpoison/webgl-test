import { BaseItemInfo, ItemType, ITEM_INFO_RECORD, Point } from "webgl-test-shared";
import Chunk from "./Chunk";
import Game from "./Game";

class ItemEntity implements BaseItemInfo {
   public readonly id: number;

   public readonly position: Point;
   /** Containing chunks */
   public readonly chunks: ReadonlyArray<Chunk>;

   public readonly rotation: number;

   public readonly type: ItemType;
   public readonly name: string;

   constructor(id: number, position: Point, containingChunks: ReadonlyArray<Chunk>, itemType: ItemType, rotation: number) {
      this.id = id;
      this.position = position;
      this.type = itemType;

      this.rotation = rotation;

      const itemInfo = ITEM_INFO_RECORD[itemType].info;
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

export default ItemEntity;