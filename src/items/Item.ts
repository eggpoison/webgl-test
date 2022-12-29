import { AttackPacket, BaseItemInfo, ItemType, SETTINGS } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import Client from "../client/Client";
import Player from "../entities/Player";

class Item {
   /** Amount of seconds of forced delay on when an item can be used when switching between items */
   private static readonly GLOBAL_ATTACK_DELAY_ON_SWITCH = 0.1;

   private static globalAttackDelayTimer = 0;
   
   public readonly type: ItemType;

   public count: number;

   private readonly canBeUsed: boolean;

   // eslint-disable-next-line no-empty-pattern
   constructor(itemType: ItemType, count: number, {}: BaseItemInfo) {
      this.type = itemType;
      this.count = count;

      this.canBeUsed = CLIENT_ITEM_INFO_RECORD[itemType].canBeUsed;
   }

   public static decrementGlobalItemSwitchDelay(): void {
      this.globalAttackDelayTimer -= 1 / SETTINGS.TPS;
      if (this.globalAttackDelayTimer < 0) {
         this.globalAttackDelayTimer = 0;
      }
   }

   public static canAttack(): boolean {
      return this.globalAttackDelayTimer === 0;
   }

   public onLeftClick(): void {
      Item.globalAttackDelayTimer = Item.GLOBAL_ATTACK_DELAY_ON_SWITCH;

      this.attack();
   }

   public onRightClick(): void {
      if (this.canBeUsed) {
         this.useItem();
      }
   }

   private attack(): void {
      if (Player.instance === null) return;
      
      const attackTargets = Player.calculateAttackTargets();
      const attackPacket: AttackPacket = {
         itemSlot: Player.selectedHotbarItemSlot,
         attackDirection: Player.instance.rotation,
         targetEntities: attackTargets.map(entity => entity.id)
      };
      Client.sendAttackPacket(attackPacket);
   }

   private useItem(): void {
      Client.sendItemUsePacket(Player.selectedHotbarItemSlot);
   }

   public select(): void {
      if (typeof this.onSelect !== "undefined") {
         this.onSelect();
      }
   }

   public deselect(): void {
      if (typeof this.onDeselect !== "undefined") {
         this.onDeselect();
      }
   }

   protected onSelect?(): void;

   protected onDeselect?(): void;
}

export default Item;