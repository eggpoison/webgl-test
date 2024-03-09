import { useCallback } from "react";
import { getItemTypeImage } from "../../../client-item-info";
import Tribesman from "../../../entities/Tribesman";
import { definiteGameState } from "../../../game-state/game-states";
import { leftClickItemSlot } from "../../../inventory-manipulation";
import InventoryContainer from "./InventoryContainer";
import ItemSlot from "./ItemSlot";
import { backpackItemTypes } from "./Hotbar";
import { ITEM_TYPE_RECORD, ServerComponentType } from "webgl-test-shared";
import { getSelectedEntity } from "../../../entity-selection";

const TribesmanInventory = () => {
   const tribesman = getSelectedEntity() as Tribesman;
   const inventoryComponent = tribesman.getServerComponent(ServerComponentType.inventory);
   const inventoryUseComponent = tribesman.getServerComponent(ServerComponentType.inventoryUse);

   const backpackSlotInventory = inventoryComponent.getInventory("backpackSlot");
   const armourSlotInventory = inventoryComponent.getInventory("armourSlot");

   // @Cleanup: Copy-pasted from hotbar

   const clickBackpackSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && !backpackItemTypes.includes(definiteGameState.heldItemSlot.itemSlots[1].type)) {
         return;
      }
      leftClickItemSlot(e, tribesman.id, backpackSlotInventory, 1);
   }, [backpackSlotInventory, tribesman.id]);

   const clickArmourItemSlot = useCallback((e: MouseEvent): void => {
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && ITEM_TYPE_RECORD[definiteGameState.heldItemSlot.itemSlots[1].type] !== "armour") {
         return;
      }
      leftClickItemSlot(e, tribesman.id, armourSlotInventory, 1);
   }, [armourSlotInventory, tribesman.id]);

   // @Copy and paste from hotbar

   let backpackSlotElement: JSX.Element;
   if (backpackSlotInventory.itemSlots.hasOwnProperty(1)) {
      const image = getItemTypeImage(backpackSlotInventory.itemSlots[1].type);
      backpackSlotElement = <ItemSlot className="armour-slot" onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={image} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/backpack-wireframe.png");
      backpackSlotElement = <ItemSlot className="armour-slot" onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   let armourItemSlotElement: JSX.Element;
   if (armourSlotInventory.itemSlots.hasOwnProperty(1)) {
      const image = getItemTypeImage(armourSlotInventory.itemSlots[1].type);
      armourItemSlotElement = <ItemSlot className="backpack-slot" onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={image} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/armour-wireframe.png");
      armourItemSlotElement = <ItemSlot className="backpack-slot" onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }
   
   return <div id="tribesman-inventory" className="inventory">
      {backpackSlotInventory.itemSlots.hasOwnProperty(1) ? (
         <InventoryContainer className="backpack" entityID={tribesman.id} inventory={inventoryComponent.getInventory("backpack")} />
      ) : undefined}

      <div className="hotbar-container">
         <InventoryContainer className="hotbar" entityID={tribesman.id} inventory={inventoryComponent.getInventory("hotbar")} selectedItemSlot={inventoryUseComponent.getUseInfo("hotbar").selectedItemSlot} />
         {backpackSlotElement}
         {armourItemSlotElement}
      </div>
   </div>;
}

export default TribesmanInventory;