import { useCallback, useEffect, useReducer, useState } from "react";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import { Inventory } from "../../../items/Item";
import ItemSlot from "./ItemSlot";

export let InteractInventory_setInventory: (inventory: Inventory | null) => void;
export let InteractInventory_forceUpdate: () => void;

export let interactInventoryIsOpen: () => boolean;

const InteractInventory = () => {
   const [inventory, setInventory] = useState<Inventory | null>(null);
   const [_, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      InteractInventory_setInventory = (inventory: Inventory | null) => {
         setInventory(inventory);
      }

   }, []);
   
   useEffect(() => {
      const isOpen = inventory !== null;
      interactInventoryIsOpen = () => isOpen;

      InteractInventory_forceUpdate = () => {
         if (inventory !== null) {
            forceUpdate();
         }
      }
   }, [inventory]);

   const leftClickBackpackItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
      if (inventory !== null) {
         leftClickItemSlot(e, inventory, itemSlot);
      }
   }, [inventory]);

   const rightClickBackpackItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
      if (inventory !== null) {
         rightClickItemSlot(e, inventory, itemSlot);
      }
   }, [inventory]);

   if (inventory === null) return null;
   
   const itemSlots = new Array<JSX.Element>();
   
   for (let y = 0; y < inventory.height; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < inventory.width; x++) {
         const itemSlot = y * inventory.width + x + 1;

         if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
            const item = inventory.itemSlots[itemSlot];

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

   return <div id="interact-inventory" className="inventory-container">
      {itemSlots}
   </div>;
}

export default InteractInventory;