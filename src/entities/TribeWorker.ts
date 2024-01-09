import { EntityType, InventoryData, ItemType, Point, TribeMemberAction, TribeType } from "webgl-test-shared";
import Tribesman from "./Tribesman";

class TribeWorker extends Tribesman {
   public readonly type = EntityType.tribeWorker;

   constructor(position: Point, id: number, renderDepth: number, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, rightActiveItemType: ItemType | null, rightAction: TribeMemberAction, rightFoodEatingType: ItemType | -1, rightLastActionTicks: number, leftActiveItemType: ItemType | null, leftAction: TribeMemberAction, leftFoodEatingType: ItemType | -1, leftLastActionTicks: number, hasFrostShield: boolean, warPaintType: number, inventoryData: InventoryData, activeItemSlot: number) {
      super(position, id, EntityType.tribeWorker, renderDepth, tribeID, tribeType, armourSlotInventory, backpackSlotInventory, backpackInventory, rightActiveItemType, rightAction, rightFoodEatingType, rightLastActionTicks, leftActiveItemType, leftAction, leftFoodEatingType, leftLastActionTicks, hasFrostShield, warPaintType, inventoryData, activeItemSlot);
   }
}

export default TribeWorker;