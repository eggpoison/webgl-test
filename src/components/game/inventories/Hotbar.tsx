import { useCallback, useEffect, useReducer, useState } from "react";
import { ItemType } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import Item, { Inventory } from "../../../items/Item";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import ItemSlot from "./ItemSlot";
import Player from "../../../entities/Player";
import { definiteGameState } from "../../../game-state/game-states";

export let Hotbar_update: () => void = () => {};

export let Hotbar_updateArmourItemSlot: (inventory: Inventory) => void = () => {};

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void = () => {};

const backpackItemTypes: ReadonlyArray<ItemType> = [ItemType.leather_backpack, ItemType.raw_beef];

const Hotbar = () => {
   // const [armourInventory, setArmourInventory] = useState<Inventory | null>(null);
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);
   const [, update] = useReducer(x => x + 1, 0);

   const clickBackpackItemSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      // @Unfinished
      if (definiteGameState.heldItemSlot.hasOwnProperty(1) && !backpackItemTypes.includes(definiteGameState.heldItemSlot.itemSlots[1].type)) {
         return;
      }
         leftClickItemSlot(e, Player.instance!.id, definiteGameState.backpackSlot, 1);
   }, []);

   useEffect(() => {
      Hotbar_update = () => {
         update();
      }

      Hotbar_setHotbarSelectedItemSlot = (itemSlot: number): void => {
         setSelectedItemSlot(itemSlot);
      }

      Hotbar_updateArmourItemSlot = (inventory: Inventory): void => {
         // @Unfinished
         // setArmourInventory(inventory);
      }
   }, []);

   // Create the item slots
   const hotbarItemSlots = new Array<JSX.Element>();
   for (let itemSlot = 1; itemSlot <= definiteGameState.hotbar.width * definiteGameState.hotbar.height; itemSlot++) {
      const item: Item | undefined = definiteGameState.hotbar.itemSlots[itemSlot];
      
      if (typeof item !== "undefined") {
         const imageSrc = require("../../../images/" + CLIENT_ITEM_INFO_RECORD[item.type].textureSource);
         hotbarItemSlots.push(
            <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} isSelected={itemSlot === selectedItemSlot} picturedItemImageSrc={imageSrc} itemCount={item.count} key={itemSlot} />
         );
      } else {
         hotbarItemSlots.push(
            <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} isSelected={itemSlot === selectedItemSlot} key={itemSlot} />
         );
      }
   }

   let backpackItemSlotElement: JSX.Element;
   if (definiteGameState.backpackSlot.itemSlots.hasOwnProperty(1)) {
      const backpackItemInfo = CLIENT_ITEM_INFO_RECORD[definiteGameState.backpackSlot.itemSlots[1].type];
      
      const imageSrc = require("../../../images/" + backpackItemInfo.textureSource);
      backpackItemSlotElement = <ItemSlot onClick={e => clickBackpackItemSlot(e)} isSelected={false} picturedItemImageSrc={imageSrc} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/backpack-wireframe.png");
      backpackItemSlotElement = <ItemSlot onClick={e => clickBackpackItemSlot(e)} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   let armourItemSlotElement: JSX.Element;
   // @Unfinished
   // if (armourInventory !== null) {
   //    if (armourInventory.itemSlots.hasOwnProperty(1)) {
   //       const armourItemInfo = CLIENT_ITEM_INFO_RECORD[armourInventory.itemSlots[1].type];
         
   //       const imageSrc = require("../../../images/" + armourItemInfo.textureSource);
   //       armourItemSlotElement = <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, armourInventory, 1)} isSelected={false} picturedItemImageSrc={imageSrc} />
   //    } else {
   //       const imageSrc = require("../../../images/miscellaneous/armour-wireframe.png");
   //       armourItemSlotElement = <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, armourInventory, 1)} isSelected={false} picturedItemImageSrc={imageSrc} />
   //    }
   // } else {
   //    const imageSrc = require("../../../images/miscellaneous/armour-wireframe.png");
   //    armourItemSlotElement = <ItemSlot isSelected={false} picturedItemImageSrc={imageSrc} />
   // }


   return <div id="hotbar">
      <div className="flex-balancer inventory">
         <ItemSlot isSelected={false} />
         <ItemSlot isSelected={false} />
      </div>

      <div className="inventory">
         {hotbarItemSlots}
      </div>

      <div id="special-item-slots" className="inventory">
         {backpackItemSlotElement}
         {/* @Unfinished */}
         {/* {armourItemSlotElement} */}
      </div>
   </div>;
}

export default Hotbar;