import { BowItemInfo, ItemType, SETTINGS } from "webgl-test-shared";
import Item from "./Item";
import { rightMouseButtonIsPressed } from "../player-input";

class BowItem extends Item {
   public readonly projectileDamage: number;
   public readonly projectileKnockback: number;
   public readonly projectileAttackCooldown: number;

   private cooldown = 0;

   constructor(itemType: ItemType, count: number, id: number, itemInfo: BowItemInfo) {
      super(itemType, count, id);

      this.projectileDamage = itemInfo.projectileDamage;
      this.projectileKnockback = itemInfo.projectileKnockback;
      this.projectileAttackCooldown = itemInfo.projectileAttackCooldown;
   }
   
   public tick(): void {
      super.tick();

      this.cooldown -= 1 / SETTINGS.TPS;
      if (this.cooldown < 0) {
         this.cooldown = 0;
      }
      
      if (this.cooldown === 0 && rightMouseButtonIsPressed && this.isActive()) {
         this.sendUsePacket();
         this.cooldown = this.projectileAttackCooldown;
      }
   }
}

export default BowItem;