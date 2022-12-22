import { ItemType } from "webgl-test-shared";

class Item {
   public readonly type: ItemType;

   public count: number;

   constructor(itemType: ItemType, count: number) {
      this.type = itemType;
      this.count = count;
   }
}

export default Item;