import { FoodItemInfo, ItemType, SETTINGS } from "webgl-test-shared";
import Player from "../entities/Player";
import Item from "./Item";
import LatencyGameState from "../game-state/latency-game-state";
import DefiniteGameState from "../game-state/definite-game-state";

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
      if (this.shouldEat()) {
         this.eatTimer -= 1 / SETTINGS.TPS;

         if (this.eatTimer <= 0) {
            this.eatTimer = this.eatTime;
            this.sendUsePacket();

            // If all the food has been eaten, stop the player from eating
            if (this.count === 1) {
               LatencyGameState.playerIsEating = false;
            }
         }
      }
   }

   private shouldEat(): boolean {
      return this.isEating && DefiniteGameState.playerHealth < Player.MAX_HEALTH;
   }

   public onRightMouseButtonDown(): void {
      this.eatTimer = this.eatTime;
      this.isEating = true;

      LatencyGameState.playerIsEating = true;
   }

   public onRightMouseButtonUp(): void {
      this.isEating = false;

      LatencyGameState.playerIsEating = false;
   }

   protected onDeselect(): void {
      this.isEating = false;
   }
}

export default FoodItem;