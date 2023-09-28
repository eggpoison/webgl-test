import { FoodItemInfo, ItemType, TribeMemberAction } from "webgl-test-shared";
import Player from "../entities/Player";
import Item from "./Item";
import Board from "../Board";
import { definiteGameState, latencyGameState } from "../game-state/game-states";

class FoodItem extends Item implements FoodItemInfo {
   public readonly stackSize: number;
   public readonly healAmount: number;
   public readonly eatTime: number;

   constructor(itemType: ItemType, count: number, id: number, { stackSize, healAmount, eatTime }: FoodItemInfo) {
      super(itemType, count, id);

      this.stackSize = stackSize;
      this.healAmount = healAmount;
      this.eatTime = eatTime;
   }
   
   public tick(): void {
      super.tick();
      
      if (this.isActive() && latencyGameState.playerAction === TribeMemberAction.eat) {
         if (!this.canEat()) {
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
         this.startEating();
      }
   }

   public onRightMouseButtonUp(): void {
      this.stopEating();
   }

   public onDeselect(): void {
      this.stopEating();
   }

   private startEating(): void {
      latencyGameState.playerAction = TribeMemberAction.eat;
      Player.instance!.action = TribeMemberAction.eat;
      Player.instance!.foodEatingType = this.type;
      // @Cleanup: Is this necessary?
      Player.instance!.lastActionTicks = Board.ticks;
   }

   private stopEating(): void {
      latencyGameState.playerAction = TribeMemberAction.none;
      Player.instance!.action = TribeMemberAction.none;
      Player.instance!.foodEatingType = -1;
   }
}

export default FoodItem;