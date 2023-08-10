import {  useEffect, useReducer, useState } from "react";
import { Inventory } from "../../../items/Item";
import InventoryContainer from "./InventoryContainer";

export let InteractInventory_setInventories: (inventories: Array<Inventory> | null) => void;
export let InteractInventory_forceUpdate: () => void;

export let interactInventoryIsOpen: () => boolean;

const InteractInventory = () => {
   const [inventories, setInventories] = useState<Array<Inventory> | null>(null);
   const [_, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      InteractInventory_setInventories = (inventories: Array<Inventory> | null) => {
         setInventories(inventories);
      }

   }, []);
   
   useEffect(() => {
      const isOpen = inventories !== null;
      interactInventoryIsOpen = () => isOpen;

      InteractInventory_forceUpdate = () => {
         if (inventories !== null) {
            forceUpdate();
         }
      }
   }, [inventories]);

   // const leftClickBackpackItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
   //    if (inventories !== null) {
   //       leftClickItemSlot(e, inventories, itemSlot);
   //    }
   // }, [inventories]);

   // const rightClickBackpackItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
   //    if (inventories !== null) {
   //       rightClickItemSlot(e, inventories, itemSlot);
   //    }
   // }, [inventories]);

   if (inventories === null) return null;
   
   // const itemSlots = new Array<JSX.Element>();
   
   // for (let y = 0; y < inventories.height; y++) {
   //    const rowItemSlots = new Array<JSX.Element>();
   //    for (let x = 0; x < inventories.width; x++) {
   //       const itemSlot = y * inventories.width + x + 1;

   //       if (inventories.itemSlots.hasOwnProperty(itemSlot)) {
   //          const item = inventories.itemSlots[itemSlot];

   //          const itemImageSrc = require(`../../../images/items/${CLIENT_ITEM_INFO_RECORD[item.type].textureSource}`);

   //          rowItemSlots.push(
   //             <ItemSlot key={x} onClick={e => leftClickBackpackItemSlot(e, itemSlot)} onContextMenu={e => rightClickBackpackItemSlot(e, itemSlot)} picturedItemImageSrc={itemImageSrc} itemCount={item.count} isSelected={false} />
   //          );
   //       } else {
   //          rowItemSlots.push(
   //             <ItemSlot key={x} onClick={e => leftClickBackpackItemSlot(e, itemSlot)} onContextMenu={e => rightClickBackpackItemSlot(e, itemSlot)} isSelected={false} />
   //          );
   //       }
   //    }
      
   //    itemSlots.push(
   //       <div key={y} className="inventory-row">
   //          {rowItemSlots}
   //       </div>
   //    );
   // }

   return <div id="interact-inventory" className="inventory">
      {inventories.map((inventory, i) => {
         return <InventoryContainer inventory={inventory} key={i} />
      })}
   </div>;
}

export default InteractInventory;