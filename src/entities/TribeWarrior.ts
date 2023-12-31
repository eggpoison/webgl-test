import { EntityType, InventoryData, ItemType, Point, TribeMemberAction, TribeType } from "webgl-test-shared";
import Tribesman from "./Tribesman";

class TribeWarrior extends Tribesman {
   public readonly type = EntityType.tribeWarrior;

   constructor(position: Point, id: number, renderDepth: number, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, activeItem: ItemType | null, action: TribeMemberAction, foodEatingType: ItemType | -1, lastActionTicks: number, hasFrostShield: boolean, warPaintType: number, inventoryData: InventoryData, activeItemSlot: number) {
      super(position, id, EntityType.tribeWarrior, renderDepth, tribeID, tribeType, armourSlotInventory, backpackSlotInventory, backpackInventory, activeItem, action, foodEatingType, lastActionTicks, hasFrostShield, warPaintType, inventoryData, activeItemSlot);
   }
}

export default TribeWarrior;