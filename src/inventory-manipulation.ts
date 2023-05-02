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

      const clickedItem = inventory[itemSlot];

      // Attempt to pick up the item if there isn't a held item
      if (Player.heldItem === null) {
         Client.sendItemPickupPacket(inventoryType, itemSlot, clickedItem.count);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to add the held item to the clicked item
         if (clickedItem.type === Player.heldItem.type) {
            Client.sendItemReleasePacket(inventoryType, itemSlot, Player.heldItem.count);
         }
      }
   } else {
      // There is no item in the item slot

      // Attempt to release the held item into the item slot if there is a held item
      if (Player.heldItem !== null) {
         Client.sendItemReleasePacket(inventoryType, itemSlot, Player.heldItem.count);
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

         Client.sendItemPickupPacket(inventoryType, itemSlot, pickupCount);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to drop 1 of the held item
         if (clickedItem.type === Player.heldItem.type) {
            Client.sendItemReleasePacket(inventoryType, itemSlot, 1);
         }
      }
   } else {
      // There is no item in the clicked item slot
      
      if (Player.heldItem !== null) {
         // Attempt to place one of the held item into the clicked item slot
         Client.sendItemReleasePacket(inventoryType, itemSlot, 1);
      }
   }
}