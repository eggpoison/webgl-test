import { useCallback, useEffect, useState } from "react";
import { BackpackItemInfo, ItemType, ITEM_INFO_RECORD, SETTINGS } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import Client from "../../client/Client";
import Player, { Inventory } from "../../entities/Player";
import Item from "../../items/Item";
import { setHeldItemVisualPosition } from "./HeldItem";
import ItemSlot from "./ItemSlot";
import { craftingMenuIsOpen } from "./menus/CraftingMenu";

export let Hotbar_updateHotbarInventory: (inventory: Inventory) => void;

export let Hotbar_updateBackpackItemSlot: (backpack: Item | null) => void;

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void;

const backpackItemTypes: ReadonlyArray<ItemType> = ["leather_backpack"];

const Hotbar = () => {
   const [hotbarSize, setHotbarSize] = useState(SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE);
   const [hotbarInventory, setHotbarInventory] = useState<Inventory>({});
   const [backpackItemSlot, setBackpackItemSlot] = useState<Item | null>(null);
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);

   const clickItemSlot = useCallback((e: MouseEvent, itemSlot: number): void => {
      // Item slots can only be interacted with while the crafting menu is open
      if (!craftingMenuIsOpen()) return;

      if (hotbarInventory.hasOwnProperty(itemSlot)) {
         // There is an item in the item slot

         // Attempt to pick up the item if there isn't a held item
         if (Player.heldItem === null) {
            Client.sendItemHoldPacket("hotbar", itemSlot);
      
            setHeldItemVisualPosition(e.clientX, e.clientY);
         }
      } else {
         // There is no item in the item slot

         // Attempt to release the held item into the item slot if there is a held item
         if (Player.heldItem !== null) {
            Client.sendItemReleasePacket("hotbar", itemSlot);
         }
      }
   }, [hotbarInventory]);

   const equipBackpack = (backpack: Item): void => {
      const backpackItemInfo = (ITEM_INFO_RECORD[backpack.type] as BackpackItemInfo)
      
      const newPlayerHotbarSize = SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE + backpackItemInfo.numExtraItemSlots;
      Player.setHotbarSize(newPlayerHotbarSize);
      setHotbarSize(newPlayerHotbarSize);
      console.log(newPlayerHotbarSize);
   }
   
   const unequipBackpack = (): void => {
      Player.setHotbarSize(SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE);
      setHotbarSize(SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE);
      console.log(SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE);
   }

   const clickBackpackItemSlot = useCallback((e: MouseEvent): void => {
      // Item slots can only be interacted with while the crafting menu is open
      if (!craftingMenuIsOpen()) return;
      
      if (backpackItemSlot !== null) {
         // There is an item in the backpack item slot

         // Attempt to pick the backpack up if there isn't a held item
         if (Player.heldItem === null) {
            Client.sendItemHoldPacket("backpackItemSlot", -1);
      
            setHeldItemVisualPosition(e.clientX, e.clientY);

            unequipBackpack();
         }
      } else {
         // There is no backpack in the backpack item slot

         // Attempt to put a backpack in the slot if there is a held item
         if (Player.heldItem !== null && backpackItemTypes.includes(Player.heldItem.type)) {
            Client.sendItemReleasePacket("backpackItemSlot", -1);

            // Note: at this point in time, the server hasn't registered that the player has equipped the backpack into the backpack item slot and so we need to get the item from the held item
            const backpack = Player.heldItem;
            if (backpack !== null) {
               equipBackpack(backpack);
            }
         }
      }
   }, [backpackItemSlot]);

   useEffect(() => {
      Hotbar_updateHotbarInventory = (inventory: Inventory): void => {
         setHotbarInventory(inventory);
      }

      Hotbar_updateBackpackItemSlot = (backpack: Item | null): void => {
         setBackpackItemSlot(backpack);
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
         const imageSrc = require("../../images/items/" + CLIENT_ITEM_INFO_RECORD[item.type].textureSrc);
         hotbarItemSlots.push(
            <ItemSlot onClick={e => clickItemSlot(e, itemSlot)} isSelected={itemSlot === selectedItemSlot} picturedItemImageSrc={imageSrc} itemCount={item.count} key={itemSlot} />
         );
      } else {
         hotbarItemSlots.push(
            <ItemSlot onClick={e => clickItemSlot(e, itemSlot)} isSelected={itemSlot === selectedItemSlot} key={itemSlot} />
         );
      }
   }

   let backpackItemSlotElement: JSX.Element;
   if (backpackItemSlot !== null) {
      const imageSrc = require("../../images/items/" + CLIENT_ITEM_INFO_RECORD[backpackItemSlot.type].textureSrc);
      backpackItemSlotElement = <ItemSlot onClick={e => clickBackpackItemSlot(e)} isSelected={false} picturedItemImageSrc={imageSrc} />
   } else {
      const imageSrc = require("../../images/miscellaneous/backpack-wireframe.png");
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