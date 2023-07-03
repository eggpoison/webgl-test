import { useCallback, useEffect, useState } from "react";
import { BackpackItemInfo, ItemType, ITEM_INFO_RECORD, SETTINGS } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import Client from "../../../client/Client";
import Item, { ItemSlots } from "../../../items/Item";
import { setHeldItemVisualPosition } from "../HeldItem";
import { inventoryIsOpen } from "../menus/CraftingMenu";
import { BackpackInventoryMenu_setBackpackItemInfo } from "./BackpackInventory";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import Game from "../../../Game";
import ItemSlot from "./ItemSlot";

export let Hotbar_updateHotbarInventory: (inventory: ItemSlots) => void = () => {};

/**
 * Updates the backpack item slot shown in the hotbar.
 */
export let Hotbar_updateBackpackItemSlot: (backpack: Item | null) => void = () => {};

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void = () => {};

const backpackItemTypes: ReadonlyArray<ItemType> = ["leather_backpack", "raw_beef"];

const Hotbar = () => {
   const [hotbarSize, setHotbarSize] = useState(SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE);
   const [hotbarInventory, setHotbarInventory] = useState<ItemSlots>({});
   const [backpackItemSlot, setBackpackItemSlot] = useState<Item | null>(null);
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);

   const leftClickHotbarItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
      leftClickItemSlot(e, hotbarInventory, itemSlot, "hotbar");
   }, [hotbarInventory]);

   const rightClickHotbarItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
      rightClickItemSlot(e, hotbarInventory, itemSlot, "hotbar");
   }, [hotbarInventory]);

   const equipBackpack = (backpack: Item): void => {
      const backpackItemInfo = (ITEM_INFO_RECORD[backpack.type] as BackpackItemInfo);

      BackpackInventoryMenu_setBackpackItemInfo(backpackItemInfo);
   }
   
   const unequipBackpack = (): void => {
      BackpackInventoryMenu_setBackpackItemInfo(null);
   }

   const clickBackpackItemSlot = useCallback((e: MouseEvent): void => {
      // Item slots can only be interacted with while the crafting menu is open
      if (!inventoryIsOpen()) return;

      if (backpackItemSlot !== null) {
         // There is an item in the backpack item slot

         // Attempt to pick the backpack up if there isn't a held item
         if (Game.definiteGameState.heldItemSlot === null) {
            Client.sendItemPickupPacket("backpackItemSlot", -1, 1);
      
            setHeldItemVisualPosition(e.clientX, e.clientY);

            unequipBackpack();
         }
      } else {
         // There is no backpack in the backpack item slot

         // Attempt to put a backpack in the slot if there is a held item
         if (Game.definiteGameState.heldItemSlot !== null && backpackItemTypes.includes(Game.definiteGameState.heldItemSlot.type)) {
            Client.sendItemReleasePacket("backpackItemSlot", -1, 1);

            // Note: at this point in time, the server hasn't registered that the player has equipped the backpack into the backpack item slot and so we need to get the item from the held item
            const backpack = Game.definiteGameState.heldItemSlot;
            if (backpack !== null && backpack.type !== "raw_beef") {
               equipBackpack(backpack);
            }
         }
      }
   }, [backpackItemSlot]);

   useEffect(() => {
      Hotbar_updateHotbarInventory = (inventory: ItemSlots): void => {
         const inventoryCopy = Object.assign({}, inventory);
         setHotbarInventory(inventoryCopy);
      }

      Hotbar_updateBackpackItemSlot = (backpack: Item | null): void => {
         if (backpack === null) {
            setBackpackItemSlot(backpack);
         } else {
            const backpackCopy = Object.assign({}, backpack);
            setBackpackItemSlot(backpackCopy);
         }
      }

      Hotbar_setHotbarSelectedItemSlot = (itemSlot: number): void => {
         setSelectedItemSlot(itemSlot);
      }
   }, []);

   // Create the item slots
   const hotbarItemSlots = new Array<JSX.Element>();
   for (let itemSlot = 1; itemSlot <= hotbarSize; itemSlot++) {
      const item: Item | undefined = hotbarInventory[itemSlot];
      
      if (typeof item !== "undefined") {
         const imageSrc = require("../../../images/items/" + CLIENT_ITEM_INFO_RECORD[item.type].textureSrc);
         hotbarItemSlots.push(
            <ItemSlot onClick={e => leftClickHotbarItemSlot(e, itemSlot)} onContextMenu={e => rightClickHotbarItemSlot(e, itemSlot)} isSelected={itemSlot === selectedItemSlot} picturedItemImageSrc={imageSrc} itemCount={item.count} key={itemSlot} />
         );
      } else {
         hotbarItemSlots.push(
            <ItemSlot onClick={e => leftClickHotbarItemSlot(e, itemSlot)} onContextMenu={e => rightClickHotbarItemSlot(e, itemSlot)} isSelected={itemSlot === selectedItemSlot} key={itemSlot} />
         );
      }
   }

   let backpackItemSlotElement: JSX.Element;
   if (backpackItemSlot !== null) {
      console.log(backpackItemSlot);
      const backpackItemInfo = CLIENT_ITEM_INFO_RECORD[backpackItemSlot.type];
      
      const imageSrc = require("../../../images/items/" + backpackItemInfo.textureSrc);
      backpackItemSlotElement = <ItemSlot onClick={e => clickBackpackItemSlot(e)} isSelected={false} picturedItemImageSrc={imageSrc} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/backpack-wireframe.png");
      backpackItemSlotElement = <ItemSlot onClick={e => clickBackpackItemSlot(e)} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   return <div id="inventory">
      <div className="flex-balancer inventory-container">
         <ItemSlot isSelected={false} />
      </div>

      <div id="hotbar" className="inventory-container">
         {hotbarItemSlots}
      </div>

      <div id="special-item-slots" className="inventory-container">
         {backpackItemSlotElement}
      </div>
   </div>;
}

export default Hotbar;