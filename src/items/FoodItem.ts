import { FoodItemInfo, ItemType, SETTINGS } from "webgl-test-shared";
import Player from "../entities/Player";
import Item from "./Item";

class FoodItem extends Item implements FoodItemInfo {
   public readonly stackSize: number;
   public readonly healAmount: number;
   public readonly eatTime: number;

   private eatTimer: number;

   private isEating: boolean = false;

   // eslint-disable-next-line no-empty-pattern
   constructor(itemType: ItemType, count: number, { stackSize, healAmount, eatTime }: FoodItemInfo) {
      super(itemType, count);

      this.stackSize = stackSize;
      this.healAmount = healAmount;
      this.eatTime = eatTime;

      this.eatTimer = eatTime;
   }
   
   public tick(): void {
      if (this.canEat()) {
         this.eatTimer -= 1 / SETTINGS.TPS;

         if (this.eatTimer <= 0) {
            this.eatTimer = this.eatTime;
            this.use();

            // If all the food has been eaten, stop the player from eating
            if (this.count === 1) {
               Player.isEating = false;
            }
         }
      }
   }

   private canEat(): boolean {
      return this.isEating && Player.health < Player.MAX_HEALTH;
   }

   public onRightMouseButtonDown(): void {
      this.eatTimer = this.eatTime;
      this.isEating = true;

      Player.isEating = true;
   }

   public onRightMouseButtonUp(): void {
      this.isEating = false;

      Player.isEating = false;
   }

   protected onDeselect(): void {
      this.isEating = false;
   }
}

export default FoodItem;