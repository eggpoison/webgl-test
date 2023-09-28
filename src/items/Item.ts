import { ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemData, ItemType, SETTINGS, ToolItemInfo } from "webgl-test-shared";
import Client from "../client/Client";

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

   // private _isActive = false;

   constructor(itemType: ItemType, count: number, id: number) {
      this.type = itemType;
      this.count = count;
      this.id = id;
   }

   // protected isActive(): boolean {
   //    return this._isActive;
   // }

   // public setIsActive(isActive: boolean): void {
   //    if (isActive !== this._isActive) {
   //       if (isActive) {
   //          if (typeof this.onSelect !== "undefined") {
   //             this.onSelect();
   //          }
   //       } else {
   //          if (typeof this.onDeselect !== "undefined") {
   //             this.onDeselect();
   //          }
   //       }
   //    }
      
   //    this._isActive = isActive;
   // }

   // public canAttack(): boolean {
   //    return Item.canAttack() && this.attackCooldownTimer === 0;
   // }

   // public static canAttack(): boolean {
   //    return Item.globalAttackDelayTimer === 0;
   // }

   // public updateFromServerData(itemData: ItemData): void {
   //    this.count = itemData.count;
   // }

   // public onRightMouseButtonDown?(): void;
   // public onRightMouseButtonUp?(): void;

   // protected sendUsePacket(): void {
   //    Client.sendItemUsePacket();
   // }

   // protected onSelect?(): void;

   // public onDeselect?(): void;
}

export default Item;