import { FoodItemInfo, ItemType, SETTINGS } from "webgl-test-shared";
import Player from "../entities/Player";
import Item from "./Item";
import Game from "../Game";

class FoodItem extends Item implements FoodItemInfo {
   public readonly stackSize: number;
   public readonly healAmount: number;
   public readonly eatTime: number;

   private eatTimer: number;

   // eslint-disable-next-line no-empty-pattern
   constructor(itemType: ItemType, count: number, id: number, { stackSize, healAmount, eatTime }: FoodItemInfo) {
      super(itemType, count, id);

      this.stackSize = stackSize;
      this.healAmount = healAmount;
      this.eatTime = eatTime;

      this.eatTimer = eatTime;
   }
   
   public tick(): void {
      if (this.shouldEat()) {
         this.eatTimer -= 1 / SETTINGS.TPS;

         if (this.eatTimer <= 0) {
            this.eatTimer = this.eatTime;
            this.sendUsePacket();

            // If all the food has been eaten, stop the player from eating
            if (this.count === 1) {
               Game.latencyGameState.playerIsEating = false;
            }
         }
      }
   }

   private shouldEat(): boolean {
      return Game.latencyGameState.playerIsEating && Game.definiteGameState.playerHealth < Player.MAX_HEALTH;
   }

   public onRightMouseButtonDown(): void {
      this.eatTimer = this.eatTime;

      Game.latencyGameState.playerIsEating = true;
   }

   public onRightMouseButtonUp(): void {
      Game.latencyGameState.playerIsEating = false;
   }

   protected onDeselect(): void {
      Game.latencyGameState.playerIsEating = false;
   }
}

export default FoodItem;