import {  useEffect, useReducer, useState } from "react";
import { Inventory } from "../../../items/Item";
import InventoryContainer from "./InventoryContainer";

export interface InteractInventoryInfo {
   readonly inventory: Inventory;
   readonly className?: string;
}

export let InteractInventory_setInventories: (inventories: Array<InteractInventoryInfo> | null) => void;
export let InteractInventory_forceUpdate: () => void;
export let InteractInventory_setElementClass: (className: string | undefined) => void;

export let interactInventoryIsOpen: () => boolean;

const InteractInventory = () => {
   const [inventories, setInventories] = useState<Array<InteractInventoryInfo> | null>(null);
   const [elementClass, setElementClass] = useState<string | undefined>();
   const [_, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      InteractInventory_setInventories = (inventories: Array<InteractInventoryInfo> | null) => {
         setInventories(inventories);
      }

      InteractInventory_setElementClass = (className: string | undefined): void => {
         setElementClass(className);
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

   if (inventories === null) return null;

   return <div id="interact-inventory" className={typeof elementClass !== "undefined" ? `inventory ${elementClass}` : "inventory"}>
      {inventories.map((inventoryInfo, i) => {
         return <InventoryContainer className={inventoryInfo.className} inventory={inventoryInfo.inventory} key={i} />
      })}
   </div>;
}

export default InteractInventory;