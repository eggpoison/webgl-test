import { useCallback, useEffect, useState } from "react";
import { ItemType, SETTINGS } from "webgl-test-shared";
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

   const clickBackpackItemSlot = useCallback((e: MouseEvent): void => {
      if (backpackItemSlot !== null) {
         // There is an item in the backpack item slot

         // Attempt to pick the backpack up if there isn't a held item
         if (Player.heldItem === null) {
            Client.sendItemHoldPacket("backpackItemSlot", -1);
      
            setHeldItemVisualPosition(e.clientX, e.clientY);
         }
      } else {
         // There is no backpack in the backpack item slot

         // Attempt to put a backpack in the slot if there is a held item
         if (Player.heldItem !== null && backpackItemTypes.includes(Player.heldItem.type)) {
            Client.sendItemReleasePacket("backpackItemSlot", -1);
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
   for (let itemSlot = 1; itemSlot <= SETTINGS.PLAYER_HOTBAR_SIZE; itemSlot++) {
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