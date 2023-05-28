import { BackpackItemInfo } from "webgl-test-shared";
import { useCallback, useEffect, useState } from "react";
import ItemSlot from "./ItemSlot";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import { ItemSlots } from "../../../items/Item";

export let BackpackInventoryMenu_setBackpackItemInfo: (newBackpackItemInfo: BackpackItemInfo | null) => void = () => {};
export let BackpackInventoryMenu_setBackpackItemSlots: (newBackpackItemInfo: ItemSlots) => void = () => {};

export let BackpackInventoryMenu_setIsVisible: (newIsVisible: boolean) => void = () => {};

const BackpackInventoryMenu = () => {
   const [isVisible, setIsVisible] = useState(false);
   const [backpackItemInfo, setBackpackItemInfo] = useState<BackpackItemInfo | null>(null);
   const [backpackInventory, setBackpackInventory] = useState<ItemSlots>({});

   const leftClickBackpackItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
      leftClickItemSlot(e, backpackInventory, itemSlot, "backpackInventory");
   }, [backpackInventory]);

   const rightClickBackpackItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
      rightClickItemSlot(e, backpackInventory, itemSlot, "backpackInventory");
   }, [backpackInventory]);

   useEffect(() => {
      BackpackInventoryMenu_setBackpackItemInfo = (newBackpackItemInfo: BackpackItemInfo | null): void => {
         setBackpackItemInfo(newBackpackItemInfo);
      }

      BackpackInventoryMenu_setBackpackItemSlots = (newBackpackItemSlots: ItemSlots): void => {
         setBackpackInventory(newBackpackItemSlots);
      }

      BackpackInventoryMenu_setIsVisible = (newIsVisible: boolean): void => {
         setIsVisible(newIsVisible);
      }
   }, []);

   // If the player doesn't have a backpack equipped or the menu isn't shown, don't show anything
   if (backpackItemInfo === null || !isVisible) return null;

   const itemSlots = new Array<JSX.Element>();

   for (let y = 0; y < backpackItemInfo.inventoryHeight; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < backpackItemInfo.inventoryWidth; x++) {
         const itemSlot = y * backpackItemInfo.inventoryWidth + x;

         if (backpackInventory.hasOwnProperty(itemSlot)) {
            const item = backpackInventory[itemSlot];

            const itemImageSrc = require(`../../../images/items/${CLIENT_ITEM_INFO_RECORD[item.type].textureSrc}`);

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
         <div key={y} className="backpack-inventory-row">
            {rowItemSlots}
         </div>
      );
   }
   
   return <div id="backpack-inventory" className="inventory-container">
      {itemSlots}
   </div>;
}

export default BackpackInventoryMenu;