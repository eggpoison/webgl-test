import { useEffect, useState } from "react";
import { SETTINGS } from "webgl-test-shared";
import Client from "../../client/Client";
import Player, { Inventory } from "../../entities/Player";
import Item from "../../items/Item";
import { setHeldItemVisualPosition } from "./HeldItem";
import ItemSlot from "./ItemSlot";
import { craftingMenuIsOpen } from "./menus/CraftingMenu";

export let setHotbarInventory: (inventory: Inventory) => void;

export let setHotbarSelectedItemSlot: (itemSlot: number) => void;

const Hotbar = () => {
   const [inventory, setInventory] = useState<Inventory>({});
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);

   const pickUpItem = (e: MouseEvent, itemSlot: number): void => {
      // Items can only be picked up while the crafting menu is open
      if (!craftingMenuIsOpen()) return;

      // Don't pick up the item if there is already a held item
      if (Player.heldItem !== null) return;

      Client.sendItemHoldPacket("hotbar", itemSlot);

      setHeldItemVisualPosition(e.clientX, e.clientY);
   }

   // Releases the held item in the specified item slot
   const releaseHeldItem = (itemSlot: number): void => {
      // Items can only be released while the crafting menu is open
      if (!craftingMenuIsOpen()) return;

      // If no item is held, don't try to release something
      if (Player.heldItem === null) return;

      Client.sendItemReleasePacket("hotbar", itemSlot);
   }

   useEffect(() => {
      setHotbarInventory = (inventory: Inventory): void => {
         setInventory(inventory);
      }

      setHotbarSelectedItemSlot = (itemSlot: number): void => {
         setSelectedItemSlot(itemSlot);
      }
   }, []);

   // Create the item slots
   const itemSlots = new Array<JSX.Element>();
   for (let itemSlot = 1; itemSlot <= SETTINGS.PLAYER_HOTBAR_SIZE; itemSlot++) {
      const item: Item | undefined = inventory[itemSlot];
      
      if (typeof item !== "undefined") {
         itemSlots.push(
            <ItemSlot onClick={e => pickUpItem(e, itemSlot)} isSelected={itemSlot === selectedItemSlot} picturedItemType={item?.type} itemCount={item?.count} key={itemSlot} />
         );
      } else {
         itemSlots.push(
            <ItemSlot onClick={() => releaseHeldItem(itemSlot)} isSelected={itemSlot === selectedItemSlot} key={itemSlot} />
         );
      }
   }
   
   return <div id="hotbar" className="inventory-container">
      {itemSlots}
   </div>;
}

export default Hotbar;