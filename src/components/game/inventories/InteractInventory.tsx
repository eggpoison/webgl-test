import {  useEffect, useReducer, useState } from "react";
import Entity from "../../../entities/Entity";
import BarrelInventory from "./BarrelInventory";
import TribesmanInventory from "./TribesmanInventory";
import TombstoneEpitaph from "./TombstoneEpitaph";
import CookingInventory from "./CookingInventory";
import { Inventory } from "webgl-test-shared";

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
export let InteractInventory_forceUpdate: () => void;

export let interactInventoryIsOpen: () => boolean;

const InteractInventory = (): null | JSX.Element => {
   const [inventoryType, setInventoryType] = useState<InteractInventoryType | null>(null);
   const [entity, setEntity] = useState<Entity | null>(null);
   const [, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      InteractInventory_setInventory = (inventoryType: InteractInventoryType, entity: Entity): void => {
         setInventoryType(inventoryType);
         setEntity(entity);
      }

      InteractInventory_clearInventory = (): void => {
         setInventoryType(null);
      }
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
         return <CookingInventory entity={entity} />
      }
      case InteractInventoryType.furnace: {
         return <CookingInventory entity={entity} />
      }
      case InteractInventoryType.tombstoneEpitaph: {
         return <TombstoneEpitaph entity={entity} />;
      }
      case null: {
         return null;
      }
   }
}

export default InteractInventory;