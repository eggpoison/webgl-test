import { FoodItemInfo, ItemType, SETTINGS } from "webgl-test-shared";
import Player from "../entities/Player";
import Item from "./Item";
import Board from "../Board";
import { definiteGameState, latencyGameState } from "../game-state/game-states";

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
      super.tick();
      
      if (this.isActive() && latencyGameState.playerIsEating) {
         if (this.canEat()) {
            this.eatTimer -= 1 / SETTINGS.TPS;
   
            if (this.eatTimer <= 0) {
               this.eatTimer = this.eatTime;
               this.sendUsePacket();
   
               // If all the food has been eaten, stop eating
               if (this.count === 1) {
                  this.stopEating();
               }
            }
         } else {
            // If the player can no longer eat food without wasting it, stop eating
            this.stopEating();
         }
      }
   }

   /**
    * Calculates whether or not food can be eaten without wasting it.
    */
   private canEat(): boolean {
      return definiteGameState.playerHealth < Player.MAX_HEALTH;
   }

   public onRightMouseButtonDown(): void {
      if (this.canEat()) {
         this.eatTimer = this.eatTime;
         
         this.startEating();

         Player.instance!.lastEatTicks = Board.ticks;
      }
   }

   public onRightMouseButtonUp(): void {
      this.stopEating();
   }

   protected onDeselect(): void {
      this.stopEating();
   }

   private startEating(): void {
      latencyGameState.playerIsEating = true;
      Player.instance!.foodEatingType = this.type;
   }

   private stopEating(): void {
      latencyGameState.playerIsEating = false;
      Player.instance!.foodEatingType = -1;
   }
}

export default FoodItem;