import { EntityType, InventoryData, ItemData, ItemType, Point, TribeMemberAction, TribeType } from "webgl-test-shared";
import Tribesman from "./Tribesman";

class TribeWorker extends Tribesman {
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, rightActiveItem: ItemData | null, rightAction: TribeMemberAction, rightFoodEatingType: ItemType | -1, rightLastActionTicks: number, rightThrownBattleaxeItemID: number, leftActiveItem: ItemData | null, leftAction: TribeMemberAction, leftFoodEatingType: ItemType | -1, leftLastActionTicks: number, leftThrownBattleaxeItemID: number, hasFrostShield: boolean, warPaintType: number, inventoryData: InventoryData, activeItemSlot: number) {
      super(position, id, EntityType.tribeWorker, ageTicks, renderDepth, tribeID, tribeType, armourSlotInventory, backpackSlotInventory, backpackInventory, rightActiveItem, rightAction, rightFoodEatingType, rightLastActionTicks, rightThrownBattleaxeItemID, leftActiveItem, leftAction, leftFoodEatingType, leftLastActionTicks, leftThrownBattleaxeItemID, hasFrostShield, warPaintType, inventoryData, activeItemSlot);
   }
}

export default TribeWorker;