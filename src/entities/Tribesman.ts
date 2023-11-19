import { EntityData, EntityType, InventoryData, ItemType, Point, TribeMemberAction, TribeType } from "webgl-test-shared";
import TribeMember from "./TribeMember";
import { Inventory } from "../items/Item";
import { createFootprintParticle } from "../generic-particles";
import Board from "../Board";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";

class Tribesman extends TribeMember {
   public readonly type = EntityType.tribesman;

   public readonly inventory: Inventory;

   private numFootstepsTaken = 0;

   public activeItemSlot: number;

   constructor(position: Point, id: number, renderDepth: number, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, activeItem: ItemType | null, action: TribeMemberAction, foodEatingType: ItemType | -1, lastActionTicks: number, hasFrostShield: boolean, warPaintType: number, inventoryData: InventoryData, activeItemSlot: number) {
      super(position, id, renderDepth, tribeID, tribeType, armourSlotInventory, backpackSlotInventory, backpackInventory, activeItem, action, foodEatingType, lastActionTicks, hasFrostShield, warPaintType);

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
   }

   public updateFromData(entityData: EntityData<EntityType.tribesman>): void {
      super.updateFromData(entityData);

      updateInventoryFromData(this.inventory, entityData.clientArgs[11]);

      this.activeItemSlot = entityData.clientArgs[12];
   }
}

export default Tribesman;