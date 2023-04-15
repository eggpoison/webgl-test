import { PlaceablePlayerInventoryType } from "webgl-test-shared";
import Client from "./client/Client";
import { inventoryIsOpen } from "./components/game/menus/CraftingMenu";
import Player, { ItemSlots } from "./entities/Player";
import { setHeldItemVisualPosition } from "./components/game/HeldItem";

export function leftClickItemSlot(e: MouseEvent, inventory: ItemSlots, itemSlot: number, inventoryType: PlaceablePlayerInventoryType): void {
   // Item slots can only be interacted with while the inventory is open
   if (!inventoryIsOpen()) return;

   if (inventory.hasOwnProperty(itemSlot)) {
      // There is an item in the item slot

      // Attempt to pick up the item if there isn't a held item
      if (Player.heldItem === null) {
         Client.sendItemHoldPacket(inventoryType, itemSlot);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      }
   } else {
      // There is no item in the item slot

      // Attempt to release the held item into the item slot if there is a held item
      if (Player.heldItem !== null) {
         Client.sendItemReleasePacket(inventoryType, itemSlot);
      }
   }
}

export function rightClickItemSlot(e: MouseEvent, inventory: ItemSlots, itemSlot: number, inventoryType: PlaceablePlayerInventoryType): void {
   // Item slots can only be interacted with while the crafting menu is open
   if (!inventoryIsOpen()) return;

   if (inventory.hasOwnProperty(itemSlot)) {
      const clickedItem = inventory[itemSlot];

      if (Player.heldItem === null) {
         const numItemsInSlot = clickedItem.count;

         const pickupCount = Math.ceil(numItemsInSlot / 2);

         // TODO: stuff
      }
   }
}