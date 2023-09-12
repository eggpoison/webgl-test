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
   /** Amount of seconds of forced delay on when an item can be used when switching between items */
   private static readonly GLOBAL_ATTACK_DELAY_ON_SWITCH = 0.1;

   private static globalAttackDelayTimer = 0;

   /** Unique identifier for the item */
   public readonly id: number;
   
   public type: ItemType;

   public count: number;

   private _isActive: boolean = false;

   private attackCooldown: number;
   private attackCooldownTimer = 0;

   constructor(itemType: ItemType, count: number, id: number) {
      this.type = itemType;
      this.count = count;
      this.id = id;

      const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
      if (itemTypeInfo === "axe" || itemTypeInfo === "pickaxe" || itemTypeInfo === "sword") {
         this.attackCooldown = (ITEM_INFO_RECORD[itemType] as ToolItemInfo).attackCooldown;
      } else {
         this.attackCooldown = SETTINGS.DEFAULT_ATTACK_COOLDOWN;
      }
   }

   public static decrementGlobalItemSwitchDelay(): void {
      this.globalAttackDelayTimer -= 1 / SETTINGS.TPS;
      if (this.globalAttackDelayTimer < 0) {
         this.globalAttackDelayTimer = 0;
      }
   }

   public tick(): void {
      this.attackCooldownTimer -= 1 / SETTINGS.TPS;
      if (this.attackCooldownTimer < 0) {
         this.attackCooldownTimer = 0;
      }
   }

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

   public canAttack(): boolean {
      return Item.canAttack() && this.attackCooldownTimer === 0;
   }

   public resetAttackCooldownTimer(): void {
      this.attackCooldownTimer = this.attackCooldown;
   }

   public static canAttack(): boolean {
      return Item.globalAttackDelayTimer === 0;
   }

   public static resetGlobalAttackSwitchDelay(): void {
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

   protected onSelect?(): void;

   protected onDeselect?(): void;
}

export default Item;