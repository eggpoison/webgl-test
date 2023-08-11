import { ItemData, ItemType, SETTINGS } from "webgl-test-shared";
import Client from "../client/Client";

export type ItemSlot = Item | null;

/** Stores the items inside an inventory, indexed by their slot number. */
export type ItemSlots = { [itemSlot: number]: Item };

export interface Inventory {
   itemSlots: ItemSlots;
   readonly width: number;
   readonly height: number;
   readonly entityID: number;
   readonly inventoryName: string;
}

class Item {
   /** Amount of seconds of forced delay on when an item can be used when switching between items */
   private static readonly GLOBAL_ATTACK_DELAY_ON_SWITCH = 0.1;

   private static globalAttackDelayTimer = 0;

   /** Unique identifier for the item */
   public readonly id: number;
   
   public readonly type: ItemType;

   public count: number;

   private _isActive: boolean = false;

   constructor(itemType: ItemType, count: number, id: number) {
      this.type = itemType;
      this.count = count;
      this.id = id;
   }

   public static decrementGlobalItemSwitchDelay(): void {
      this.globalAttackDelayTimer -= 1 / SETTINGS.TPS;
      if (this.globalAttackDelayTimer < 0) {
         this.globalAttackDelayTimer = 0;
      }
   }

   public tick?(): void;

   protected isActive(): boolean {
      return this._isActive;
   }

   public setIsActive(isActive: boolean): void {
      if (isActive !== this._isActive) {
         if (isActive) {
            if (typeof this.onSelect !== "undefined") {
               this.onSelect();
            }
         } else {
            if (typeof this.onDeselect !== "undefined") {
               this.onDeselect();
            }
         }
      }
      
      this._isActive = isActive;
   }

   public static canAttack(): boolean {
      return this.globalAttackDelayTimer === 0;
   }

   public resetAttackSwitchDelay(): void {
      Item.globalAttackDelayTimer = Item.GLOBAL_ATTACK_DELAY_ON_SWITCH;
   }

   public updateFromServerData(itemData: ItemData): void {
      this.count = itemData.count;
   }

   public onRightMouseButtonDown?(): void;
   public onRightMouseButtonUp?(): void;

   protected sendUsePacket(): void {
      Client.sendItemUsePacket();
   }

   // private select(): void {
   //    this._isActive = true;
   //    if (typeof this.onSelect !== "undefined") {
   //       this.onSelect();
   //    }
   // }

   // private deselect(): void {
   //    this._isActive = false;
   //    if (typeof this.onDeselect !== "undefined") {
   //       this.onDeselect();
   //    }
   // }

   protected onSelect?(): void;

   protected onDeselect?(): void;
}

export default Item;