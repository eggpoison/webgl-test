import { useCallback } from "react";
import { getItemTypeImage } from "../../../client-item-info";
import Entity from "../../../entities/Entity"
import Tribesman from "../../../entities/Tribesman";
import { definiteGameState } from "../../../game-state/game-states";
import { leftClickItemSlot } from "../../../inventory-manipulation";
import InventoryContainer from "./InventoryContainer";
import ItemSlot from "./ItemSlot";
import { backpackItemTypes } from "./Hotbar";
import { EntityType, ITEM_TYPE_RECORD } from "webgl-test-shared";

interface TribesmanInventoryProps {
   readonly entity: Entity;
}

function assertEntityIsTribesman(entity: Entity): asserts entity is Tribesman {
   if (entity.type !== EntityType.tribeWorker && entity.type !== EntityType.tribeWarrior) {
      throw new Error("Entity passed into TribesmanInventory wasn't a tribesman.");
   }
}

const TribesmanInventory = (props: TribesmanInventoryProps) => {
   assertEntityIsTribesman(props.entity);

   // @Cleanup: Copy-pasted from hotbar

   const clickBackpackSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && !backpackItemTypes.includes(definiteGameState.heldItemSlot.itemSlots[1].type)) {
         return;
      }
      leftClickItemSlot(e, props.entity.id, (props.entity as Tribesman).backpackSlotInventory, 1);
   }, [props.entity]);

   const clickArmourItemSlot = useCallback((e: MouseEvent): void => {
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && ITEM_TYPE_RECORD[definiteGameState.heldItemSlot.itemSlots[1].type] !== "armour") {
         return;
      }
      leftClickItemSlot(e, props.entity.id, (props.entity as Tribesman).armourSlotInventory, 1);
   }, [props.entity]);

   let backpackSlotElement: JSX.Element;
   if (props.entity.backpackSlotInventory.itemSlots.hasOwnProperty(1)) {
      const image = getItemTypeImage(props.entity.backpackSlotInventory.itemSlots[1].type);
      backpackSlotElement = <ItemSlot className="armour-slot" onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={image} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/backpack-wireframe.png");
      backpackSlotElement = <ItemSlot className="armour-slot" onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   let armourItemSlotElement: JSX.Element;
   if (props.entity.armourSlotInventory.itemSlots.hasOwnProperty(1)) {
      const image = getItemTypeImage(props.entity.armourSlotInventory.itemSlots[1].type);
      armourItemSlotElement = <ItemSlot className="backpack-slot" onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={image} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/armour-wireframe.png");
      armourItemSlotElement = <ItemSlot className="backpack-slot" onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }
   
   return <div id="tribesman-inventory" className="inventory">
      {props.entity.backpackSlotInventory.itemSlots.hasOwnProperty(1) ? (
         <InventoryContainer className="backpack" entityID={props.entity.id} inventory={props.entity.backpackInventory} />
      ) : undefined}

      <div className="hotbar-container">
         <InventoryContainer className="hotbar" entityID={props.entity.id} inventory={props.entity.inventory} selectedItemSlot={props.entity.activeItemSlot} />
         {backpackSlotElement}
         {armourItemSlotElement}
      </div>
   </div>;
}

export default TribesmanInventory;