import { EntityData, EntityType, InventoryData, ItemType, Point, SETTINGS, TribeMemberAction, TribeType, TribesmanState, randInt, randItem } from "webgl-test-shared";
import TribeMember from "./TribeMember";
import { Inventory } from "../items/Item";
import { createFootprintParticle } from "../generic-particles";
import Board from "../Board";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { AudioFilePath, playSound } from "../sound";

// @Memory
const GOBLIN_ANGRY_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-angry-1.mp3", "goblin-angry-2.mp3", "goblin-angry-3.mp3", "goblin-angry-4.mp3"];
const GOBLIN_ESCAPE_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-escape-1.mp3", "goblin-escape-2.mp3", "goblin-escape-3.mp3"];
const GOBLIN_AMBIENT_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-ambient-1.mp3", "goblin-ambient-2.mp3", "goblin-ambient-3.mp3", "goblin-ambient-4.mp3", "goblin-ambient-5.mp3"];

class Tribesman extends TribeMember {
   public readonly type = EntityType.tribesman;

   public readonly inventory: Inventory;

   private numFootstepsTaken = 0;
   private distanceTracker = 0;
   private state = TribesmanState.normal;

   public activeItemSlot: number;

   constructor(position: Point, id: number, renderDepth: number, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, activeItem: ItemType | null, action: TribeMemberAction, foodEatingType: ItemType | -1, lastActionTicks: number, hasFrostShield: boolean, warPaintType: number, inventoryData: InventoryData, activeItemSlot: number) {
      super(position, id, EntityType.tribesman, renderDepth, tribeID, tribeType, armourSlotInventory, backpackSlotInventory, backpackInventory, activeItem, action, foodEatingType, lastActionTicks, hasFrostShield, warPaintType);

      this.activeItemSlot = activeItemSlot;
      this.inventory = createInventoryFromData(inventoryData);
   }

   public tick(): void {
      super.tick();

      // Footsteps
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver() && Board.tickIntervalHasPassed(0.15)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 4);
         this.numFootstepsTaken++;
      }
      this.distanceTracker += this.velocity.length() / SETTINGS.TPS;
      if (this.distanceTracker > 50) {
         this.distanceTracker -= 50;
         this.createFootstepSound();
      }

      // Sounds
      switch (this.state) {
         case TribesmanState.chasing: {
            if (Math.random() < 0.2 / SETTINGS.TPS) {
               switch (this.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_ANGRY_SOUNDS), 0.4, this.position.x, this.position.y);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSound("barbarian-angry-1.mp3", 0.4, this.position.x, this.position.y);
                     break;
                  }
               }
            }
            break;
         }
         case TribesmanState.escaping: {
            if (Math.random() < 0.2 / SETTINGS.TPS) {
               switch (this.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_ESCAPE_SOUNDS), 0.4, this.position.x, this.position.y);
                     break;
                  }
               }
            }
            break;
         }
         case TribesmanState.normal: {
            if (Math.random() < 0.2 / SETTINGS.TPS) {
               switch (this.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_AMBIENT_SOUNDS), 0.4, this.position.x, this.position.y);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSound(("barbarian-ambient-" + randInt(1, 2) + ".mp3") as AudioFilePath, 0.4, this.position.x, this.position.y);
                     break;
                  }
               }
            }
            break;
         }
      }
   }

   public updateFromData(entityData: EntityData<EntityType.tribesman>): void {
      super.updateFromData(entityData);

      updateInventoryFromData(this.inventory, entityData.clientArgs[11]);

      this.activeItemSlot = entityData.clientArgs[12];
      this.state = entityData.clientArgs[13];
   }
}

export default Tribesman;