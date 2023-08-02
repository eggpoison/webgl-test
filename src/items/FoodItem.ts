import { FoodItemInfo, ItemType, SETTINGS } from "webgl-test-shared";
import Player from "../entities/Player";
import Item from "./Item";
import Game from "../Game";

class FoodItem extends Item implements FoodItemInfo {
   public readonly stackSize: number;
   public readonly healAmount: number;
   public readonly eatTime: number;

   private eatTimer: number;

   constructor(itemType: ItemType, count: number, id: number, { stackSize, healAmount, eatTime }: FoodItemInfo) {
      super(itemType, count, id);

      this.stackSize = stackSize;
      this.healAmount = healAmount;
      this.eatTime = eatTime;

      this.eatTimer = eatTime;
   }
   
   public tick(): void {
      if (this.isActive() && Game.latencyGameState.playerIsEating) {
         if (this.canEat()) {
            this.eatTimer -= 1 / SETTINGS.TPS;
   
            if (this.eatTimer <= 0) {
               this.eatTimer = this.eatTime;
               this.sendUsePacket();
   
               // If all the food has been eaten, stop the player from eating
               if (this.count === 1) {
                  Game.latencyGameState.playerIsEating = false;
               }
            }
         } else {
            // If the player can no longer eat food without wasting it, stop eating
            Game.latencyGameState.playerIsEating = false;
         }
      }
   }

   /**
    * Calculates whether or not food can be eaten without wasting it.
    */
   private canEat(): boolean {
      return Game.definiteGameState.playerHealth < Player.MAX_HEALTH;
   }

   public onRightMouseButtonDown(): void {
      if (this.canEat()) {
         this.eatTimer = this.eatTime;
         
         Game.latencyGameState.playerIsEating = true;
      }
   }

   public onRightMouseButtonUp(): void {
      Game.latencyGameState.playerIsEating = false;
   }

   protected onDeselect(): void {
      Game.latencyGameState.playerIsEating = false;
   }
}

export default FoodItem;