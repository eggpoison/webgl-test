import Client from "./client/Client";
import { inventoryIsOpen } from "./components/game/menus/CraftingMenu";
import { setHeldItemVisualPosition } from "./components/game/HeldItem";
import { Inventory } from "./items/Item";
import Game from "./Game";
import { interactInventoryIsOpen } from "./components/game/inventories/InteractInventory";

const canInteractWithItemSlots = (): boolean => {
   return inventoryIsOpen() || interactInventoryIsOpen();
}

export function leftClickItemSlot(e: MouseEvent, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the inventory is open
   if (!canInteractWithItemSlots()) return;

   if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
      // There is an item in the item slot

      const clickedItem = inventory.itemSlots[itemSlot];

      // Attempt to pick up the item if there isn't a held item
      if (!Game.definiteGameState.heldItemSlot!.itemSlots.hasOwnProperty(1)) {
         Client.sendItemPickupPacket(inventory.entityID, inventory.inventoryName, itemSlot, clickedItem.count);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to add the held item to the clicked item
         if (clickedItem.type === Game.definiteGameState.heldItemSlot!.itemSlots[1].type) {
            Client.sendItemReleasePacket(inventory.entityID, inventory.inventoryName, itemSlot, Game.definiteGameState.heldItemSlot!.itemSlots[1].count);
         }
      }
   } else {
      // There is no item in the item slot

      // Attempt to release the held item into the item slot if there is a held item
      if (Game.definiteGameState.heldItemSlot!.itemSlots.hasOwnProperty(1)) {
         Client.sendItemReleasePacket(inventory.entityID, inventory.inventoryName, itemSlot, Game.definiteGameState.heldItemSlot!.itemSlots[1].count);
      }
   }
}

export function rightClickItemSlot(e: MouseEvent, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the crafting menu is open
   if (!canInteractWithItemSlots()) return;

   if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
      const clickedItem = inventory.itemSlots[itemSlot];

      if (Game.definiteGameState.heldItemSlot === null) {
         const numItemsInSlot = clickedItem.count;
         const pickupCount = Math.ceil(numItemsInSlot / 2);

         Client.sendItemPickupPacket(inventory.entityID, inventory.inventoryName, itemSlot, pickupCount);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to drop 1 of the held item
         if (clickedItem.type === Game.definiteGameState.heldItemSlot.itemSlots[1].type) {
            Client.sendItemReleasePacket(inventory.entityID, inventory.inventoryName, itemSlot, 1);
         }
      }
   } else {
      // There is no item in the clicked item slot
      
      if (Game.definiteGameState.heldItemSlot !== null) {
         // Attempt to place one of the held item into the clicked item slot
         Client.sendItemReleasePacket(inventory.entityID, inventory.inventoryName, itemSlot, 1);
      }
   }
}