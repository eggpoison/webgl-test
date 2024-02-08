import { useCallback } from "react";
import { getItemTypeImage } from "../../../client-item-info";
import Tribesman from "../../../entities/Tribesman";
import { definiteGameState } from "../../../game-state/game-states";
import { leftClickItemSlot } from "../../../inventory-manipulation";
import InventoryContainer from "./InventoryContainer";
import ItemSlot from "./ItemSlot";
import { backpackItemTypes } from "./Hotbar";
import { ITEM_TYPE_RECORD } from "webgl-test-shared";
import { getSelectedEntity } from "../../../entity-selection";

const TribesmanInventory = () => {
   const tribesman = getSelectedEntity() as Tribesman;

   // @Cleanup: Copy-pasted from hotbar

   const clickBackpackSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && !backpackItemTypes.includes(definiteGameState.heldItemSlot.itemSlots[1].type)) {
         return;
      }
      leftClickItemSlot(e, tribesman.id, tribesman.backpackSlotInventory, 1);
   }, [tribesman.backpackSlotInventory, tribesman.id]);

   const clickArmourItemSlot = useCallback((e: MouseEvent): void => {
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && ITEM_TYPE_RECORD[definiteGameState.heldItemSlot.itemSlots[1].type] !== "armour") {
         return;
      }
      leftClickItemSlot(e, tribesman.id, tribesman.armourSlotInventory, 1);
   }, [tribesman.armourSlotInventory, tribesman.id]);

   // @Copy and paste from hotbar

   let backpackSlotElement: JSX.Element;
   if (tribesman.backpackSlotInventory.itemSlots.hasOwnProperty(1)) {
      const image = getItemTypeImage(tribesman.backpackSlotInventory.itemSlots[1].type);
      backpackSlotElement = <ItemSlot className="armour-slot" onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={image} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/backpack-wireframe.png");
      backpackSlotElement = <ItemSlot className="armour-slot" onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   let armourItemSlotElement: JSX.Element;
   if (tribesman.armourSlotInventory.itemSlots.hasOwnProperty(1)) {
      const image = getItemTypeImage(tribesman.armourSlotInventory.itemSlots[1].type);
      armourItemSlotElement = <ItemSlot className="backpack-slot" onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={image} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/armour-wireframe.png");
      armourItemSlotElement = <ItemSlot className="backpack-slot" onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }
   
   return <div id="tribesman-inventory" className="inventory">
      {tribesman.backpackSlotInventory.itemSlots.hasOwnProperty(1) ? (
         <InventoryContainer className="backpack" entityID={tribesman.id} inventory={tribesman.backpackInventory} />
      ) : undefined}

      <div className="hotbar-container">
         <InventoryContainer className="hotbar" entityID={tribesman.id} inventory={tribesman.inventory} selectedItemSlot={tribesman.activeItemSlot} />
         {backpackSlotElement}
         {armourItemSlotElement}
      </div>
   </div>;
}

export default TribesmanInventory;