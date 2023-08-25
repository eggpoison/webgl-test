import {  useEffect, useReducer, useState } from "react";
import { Inventory } from "../../../items/Item";
import Entity from "../../../entities/Entity";
import BarrelInventory from "./BarrelInventory";
import TribesmanInventory from "./TribesmanInventory";
import CampfireInventory from "./CampfireInventory";
import FurnaceInventory from "./FurnaceInventory";
import TombstoneEpitaph from "./TombstoneEpitaph";

export interface InteractInventoryInfo {
   readonly inventory: Inventory;
   readonly className?: string;
}

export enum InteractInventoryType {
   barrel,
   tribesman,
   campfire,
   furnace,
   tombstoneEpitaph
}

export let InteractInventory_setInventory: (inventoryType: InteractInventoryType, entity: Entity) => void;
export let InteractInventory_clearInventory: () => void;
// export let InteractInventory_setEntityID: (entityID: number) => void;
// export let InteractInventory_setInventories: (inventories: Array<InteractInventoryInfo> | null) => void;
export let InteractInventory_forceUpdate: () => void;
// export let InteractInventory_setElementClass: (className: string | undefined) => void;

export let interactInventoryIsOpen: () => boolean;

const InteractInventory = (): null | JSX.Element => {
   // const [entityID, setEntityID] = useState<number>(-1);
   // const [inventories, setInventories] = useState<Array<InteractInventoryInfo> | null>(null);
   // const [elementClass, setElementClass] = useState<string | undefined>();
   const [inventoryType, setInventoryType] = useState<InteractInventoryType | null>(null);
   const [entity, setEntity] = useState<Entity | null>(null);
   const [_, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      InteractInventory_setInventory = (inventoryType: InteractInventoryType, entity: Entity): void => {
         setInventoryType(inventoryType);
         setEntity(entity);
      }

      InteractInventory_clearInventory = (): void => {
         setInventoryType(null);
      }
      // InteractInventory_setEntityID = (entityID: number): void => {
      //    setEntityID(entityID);
      // }

      // InteractInventory_setInventories = (inventories: Array<InteractInventoryInfo> | null) => {
      //    setInventories(inventories);
      // }

      // InteractInventory_setElementClass = (className: string | undefined): void => {
      //    setElementClass(className);
      // }
   }, []);
   
   useEffect(() => {
      const isOpen = inventoryType !== null;
      interactInventoryIsOpen = () => isOpen;

      InteractInventory_forceUpdate = () => {
         if (inventoryType !== null) {
            forceUpdate();
         }
      }
   }, [inventoryType]);

   if (entity === null) {
      return null;
   }

   switch (inventoryType) {
      case InteractInventoryType.barrel: {
         return <BarrelInventory entity={entity} />
      }
      case InteractInventoryType.tribesman: {
         return <TribesmanInventory entity={entity} />
      }
      case InteractInventoryType.campfire: {
         return <CampfireInventory entity={entity} />
      }
      case InteractInventoryType.furnace: {
         return <FurnaceInventory entity={entity} />
      }
      case InteractInventoryType.tombstoneEpitaph: {
         return <TombstoneEpitaph entity={entity} />;
      }
      case null: {
         return null;
      }
   }
   // return <div id="interact-inventory" className={typeof elementClass !== "undefined" ? `inventory ${elementClass}` : "inventory"}>
   //    {inventories.map((inventoryInfo, i) => {
   //       return <InventoryContainer entityID={entityID} className={inventoryInfo.className} inventory={inventoryInfo.inventory} key={i} />
   //    })}
   // </div>;
}

export default InteractInventory;