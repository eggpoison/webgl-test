import { EntityData, EntityType, Inventory, InventoryData, ItemData, ItemType, Point, Settings, TribeMemberAction, TribeType, TribesmanState, randInt, randItem } from "webgl-test-shared";
import TribeMember from "./TribeMember";
import { createFootprintParticle } from "../particles";
import Board from "../Board";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { AudioFilePath, playSound } from "../sound";

// @Memory
const GOBLIN_ANGRY_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-angry-1.mp3", "goblin-angry-2.mp3", "goblin-angry-3.mp3", "goblin-angry-4.mp3"];
const GOBLIN_ESCAPE_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-escape-1.mp3", "goblin-escape-2.mp3", "goblin-escape-3.mp3"];
const GOBLIN_AMBIENT_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-ambient-1.mp3", "goblin-ambient-2.mp3", "goblin-ambient-3.mp3", "goblin-ambient-4.mp3", "goblin-ambient-5.mp3"];

abstract class Tribesman extends TribeMember {
   public readonly inventory: Inventory;

   private numFootstepsTaken = 0;
   private distanceTracker = 0;
   private state = TribesmanState.normal;

   public activeItemSlot: number;

   constructor(position: Point, id: number, entityType: EntityType, ageTicks: number, renderDepth: number, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, rightActiveItem: ItemData | null, rightAction: TribeMemberAction, rightFoodEatingType: ItemType | -1, rightLastActionTicks: number, rightThrownBattleaxeItemID: number, leftActiveItem: ItemData | null, leftAction: TribeMemberAction, leftFoodEatingType: ItemType | -1, leftLastActionTicks: number, leftThrownBattleaxeItemID: number, hasFrostShield: boolean, warPaintType: number, inventoryData: InventoryData, activeItemSlot: number) {
      super(position, id, entityType, ageTicks, renderDepth, tribeID, tribeType, armourSlotInventory, backpackSlotInventory, backpackInventory, rightActiveItem, rightAction, rightFoodEatingType, rightLastActionTicks, rightThrownBattleaxeItemID, leftActiveItem, leftAction, leftFoodEatingType, leftLastActionTicks, leftThrownBattleaxeItemID, hasFrostShield, warPaintType);

      this.activeItemSlot = activeItemSlot;
      this.inventory = createInventoryFromData(inventoryData);

      playSound("door-open.mp3", 0.4, 1, this.position.x, this.position.y);
   }

   public tick(): void {
      super.tick();

      // Footsteps
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver() && Board.tickIntervalHasPassed(0.15)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 4);
         this.numFootstepsTaken++;
      }
      this.distanceTracker += this.velocity.length() / Settings.TPS;
      if (this.distanceTracker > 50) {
         this.distanceTracker -= 50;
         this.createFootstepSound();
      }

      // Sounds
      switch (this.state) {
         case TribesmanState.chasing: {
            if (Math.random() < 0.2 / Settings.TPS) {
               switch (this.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_ANGRY_SOUNDS), 0.4, 1, this.position.x, this.position.y);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSound("barbarian-angry-1.mp3", 0.4, 1, this.position.x, this.position.y);
                     break;
                  }
               }
            }
            break;
         }
         case TribesmanState.escaping: {
            if (Math.random() < 0.2 / Settings.TPS) {
               switch (this.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_ESCAPE_SOUNDS), 0.4, 1, this.position.x, this.position.y);
                     break;
                  }
               }
            }
            break;
         }
         case TribesmanState.normal: {
            if (Math.random() < 0.2 / Settings.TPS) {
               switch (this.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_AMBIENT_SOUNDS), 0.4, 1, this.position.x, this.position.y);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSound(("barbarian-ambient-" + randInt(1, 2) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
                     break;
                  }
               }
            }
            break;
         }
      }
   }

   public updateFromData(entityData: EntityData<EntityType.tribeWorker | EntityType.tribeWarrior>): void {
      super.updateFromData(entityData);

      updateInventoryFromData(this.inventory, entityData.clientArgs[17]);

      this.activeItemSlot = entityData.clientArgs[18];
      this.state = entityData.clientArgs[19];
   }
}

export default Tribesman;