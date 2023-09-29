import { ItemType } from "webgl-test-shared";

export type ItemSlot = Item | null;

/** Stores the items inside an inventory, indexed by their slot number. */
export type ItemSlots = { [itemSlot: number]: Item };

export interface Inventory {
   itemSlots: ItemSlots;
   width: number;
   height: number;
   readonly inventoryName: string;
}

class Item {
   /** Unique identifier for the item */
   public readonly id: number;
   
   public type: ItemType;
   public count: number;

   constructor(itemType: ItemType, count: number, id: number) {
      this.type = itemType;
      this.count = count;
      this.id = id;
   }
}

export default Item;