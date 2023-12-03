import { useCallback, useEffect, useReducer, useState } from "react";
import { ITEM_TYPE_RECORD, ItemType } from "webgl-test-shared";
import { getItemTypeImage } from "../../../client-item-info";
import Item from "../../../items/Item";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import ItemSlot from "./ItemSlot";
import Player from "../../../entities/Player";
import { definiteGameState } from "../../../game-state/game-states";

export let Hotbar_update: () => void = () => {};

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void = () => {};

export const backpackItemTypes: ReadonlyArray<ItemType> = [ItemType.leather_backpack, ItemType.raw_beef];

const Hotbar = () => {
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);
   const [, update] = useReducer(x => x + 1, 0);

   const clickBackpackSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && !backpackItemTypes.includes(definiteGameState.heldItemSlot.itemSlots[1].type)) {
         return;
      }
      leftClickItemSlot(e, Player.instance!.id, definiteGameState.backpackSlot, 1);
   }, []);

   const clickArmourItemSlot = useCallback((e: MouseEvent): void => {
      // Don't click it the player is holding a non-armour item
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && ITEM_TYPE_RECORD[definiteGameState.heldItemSlot.itemSlots[1].type] !== "armour") {
         return;
      }

      leftClickItemSlot(e, Player.instance!.id, definiteGameState.armourSlot, 1);
   }, []);

   useEffect(() => {
      Hotbar_update = () => {
         update();
      }

      Hotbar_setHotbarSelectedItemSlot = (itemSlot: number): void => {
         setSelectedItemSlot(itemSlot);
      }
   }, []);

   // Create the item slots
   const hotbarItemSlots = new Array<JSX.Element>();
   for (let itemSlot = 1; itemSlot <= definiteGameState.hotbar.width * definiteGameState.hotbar.height; itemSlot++) {
      const item: Item | undefined = definiteGameState.hotbar.itemSlots[itemSlot];
      
      if (typeof item !== "undefined") {
         const imageSrc = getItemTypeImage(item.type);
         hotbarItemSlots.push(
            <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} isSelected={itemSlot === selectedItemSlot} picturedItemImageSrc={imageSrc} itemCount={item.count} key={itemSlot} />
         );
      } else {
         hotbarItemSlots.push(
            <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} isSelected={itemSlot === selectedItemSlot} key={itemSlot} />
         );
      }
   }

   let backpackSlotElement: JSX.Element;
   if (definiteGameState.backpackSlot.itemSlots.hasOwnProperty(1)) {
      const image = getItemTypeImage(definiteGameState.backpackSlot.itemSlots[1].type);
      backpackSlotElement = <ItemSlot onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={image} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/backpack-wireframe.png");
      backpackSlotElement = <ItemSlot onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   let armourItemSlotElement: JSX.Element;
   if (definiteGameState.armourSlot.itemSlots.hasOwnProperty(1)) {
      const image = getItemTypeImage(definiteGameState.armourSlot.itemSlots[1].type);
      armourItemSlotElement = <ItemSlot onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={image} itemCount={definiteGameState.armourSlot.itemSlots[1].count} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/armour-wireframe.png");
      armourItemSlotElement = <ItemSlot onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   return <div id="hotbar">
      {/* @Cleanup: This shouldn't be necessary, too overcomplicated */}
      <div className="flex-balancer inventory">
         <ItemSlot isSelected={false} />
         <ItemSlot isSelected={false} />
      </div>

      <div className="inventory">
         {hotbarItemSlots}
      </div>

      <div id="special-item-slots" className="inventory">
         {backpackSlotElement}
         {armourItemSlotElement}
      </div>
   </div>;
}

export default Hotbar;