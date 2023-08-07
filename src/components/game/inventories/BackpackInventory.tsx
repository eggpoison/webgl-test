import { useCallback, useEffect, useState } from "react";
import ItemSlot from "./ItemSlot";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import { Inventory } from "../../../items/Item";

export let BackpackInventoryMenu_setIsVisible: (isVisible: boolean) => void = () => {};
export let BackpackInventoryMenu_setBackpackInventory: (inventory: Inventory | null) => void = () => {};

const BackpackInventoryMenu = () => {
   const [isVisible, setIsVisible] = useState(false);
   const [backpackInventory, setBackpackInventory] = useState<Inventory | null>(null);

   const leftClickBackpackItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
      if (backpackInventory !== null) {
         leftClickItemSlot(e, backpackInventory, itemSlot);
      }
   }, [backpackInventory]);

   const rightClickBackpackItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
      if (backpackInventory !== null) {
         rightClickItemSlot(e, backpackInventory, itemSlot);
      }
   }, [backpackInventory]);

   useEffect(() => {
      BackpackInventoryMenu_setIsVisible = (isVisible: boolean) => {
         setIsVisible(isVisible);
      }
      
      BackpackInventoryMenu_setBackpackInventory = (inventory: Inventory | null): void => {
         setBackpackInventory(inventory);
      }
   }, []);

   // If the player doesn't have a backpack equipped or the menu isn't shown, don't show anything
   if (backpackInventory === null || !isVisible) return null;

   const itemSlots = new Array<JSX.Element>();

   for (let y = 0; y < backpackInventory.height; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < backpackInventory.width; x++) {
         const itemSlot = y * backpackInventory.width + x;

         if (backpackInventory.itemSlots.hasOwnProperty(itemSlot)) {
            const item = backpackInventory.itemSlots[itemSlot];

            const itemImageSrc = require(`../../../images/items/${CLIENT_ITEM_INFO_RECORD[item.type].textureSource}`);

            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickBackpackItemSlot(e, itemSlot)} onContextMenu={e => rightClickBackpackItemSlot(e, itemSlot)} picturedItemImageSrc={itemImageSrc} itemCount={item.count} isSelected={false} />
            );
         } else {
            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickBackpackItemSlot(e, itemSlot)} onContextMenu={e => rightClickBackpackItemSlot(e, itemSlot)} isSelected={false} />
            );
         }
      }
      
      itemSlots.push(
         <div key={y} className="inventory-row">
            {rowItemSlots}
         </div>
      );
   }
   
   return <div id="backpack-inventory" className="inventory-container">
      {itemSlots}
   </div>;
}

export default BackpackInventoryMenu;