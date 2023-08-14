import { BowItemInfo, ItemType } from "webgl-test-shared";
import Item from "./Item";
import { rightMouseButtonIsPressed } from "../player-input";

class BowItem extends Item {
   public readonly projectileDamage: number;
   public readonly projectileKnockback: number;
   public readonly projectileAttackCooldown: number;

   constructor(itemType: ItemType, count: number, id: number, itemInfo: BowItemInfo) {
      super(itemType, count, id);

      this.projectileDamage = itemInfo.projectileDamage;
      this.projectileKnockback = itemInfo.projectileKnockback;
      this.projectileAttackCooldown = itemInfo.projectileAttackCooldown;
   }
   
   public tick(): void {
      if (rightMouseButtonIsPressed && this.isActive()) {
         this.fire();
      }
   }

   private fire(): void {
      this.sendUsePacket();
   }
}

export default BowItem;