import { useEffect, useReducer, useState } from "react";
import BarrelInventory from "./BarrelInventory";
import CookingInventory from "./CookingInventory";
import TombstoneEpitaph from "./TombstoneEpitaph";
import TribesmanInventory from "./TribesmanInventory";
import AmmoBoxInventory from "./AmmoBoxInventory";

export enum InventoryMenuType {
   none,
   barrel,
   tribesman,
   campfire,
   furnace,
   tombstone,
   ammoBox
}

export let InventorySelector_setInventoryMenuType: (inventoryMenuType: InventoryMenuType) => void = () => {};
export let InventorySelector_forceUpdate: () => void = () => {};
export let InventorySelector_inventoryIsOpen: () => boolean;

const InventorySelector = () => {
   const [inventoryMenuType, setInventoryMenuType] = useState(InventoryMenuType.none);
   // @Speed @Memory: Only update when the current inventory changes
   const [, forceUpdate] = useReducer(x => x + 1, 0);
   
   useEffect(() => {
      InventorySelector_forceUpdate = () => {
         forceUpdate();
      }

      InventorySelector_setInventoryMenuType = (inventoryMenuType: InventoryMenuType): void => {
         setInventoryMenuType(inventoryMenuType);
      }
   }, []);

   useEffect(() => {
      InventorySelector_inventoryIsOpen = () => {
         return inventoryMenuType !== InventoryMenuType.none;
      }
   }, [inventoryMenuType]);

   switch (inventoryMenuType) {
      case InventoryMenuType.barrel: {
         return <BarrelInventory />
      }
      case InventoryMenuType.tribesman: {
         return <TribesmanInventory />
      }
      case InventoryMenuType.campfire: {
         return <CookingInventory />
      }
      case InventoryMenuType.furnace: {
         return <CookingInventory />
      }
      case InventoryMenuType.tombstone: {
         return <TombstoneEpitaph />;
      }
      case InventoryMenuType.ammoBox: {
         return <AmmoBoxInventory />;
      }
   }
   
   return null;
}

export default InventorySelector;