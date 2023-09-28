import Client from "./client/Client";
import { inventoryIsOpen } from "./components/game/menus/CraftingMenu";
import { setHeldItemVisualPosition } from "./components/game/HeldItem";
import Item, { Inventory, ItemSlots } from "./items/Item";
import { interactInventoryIsOpen } from "./components/game/inventories/InteractInventory";
import { definiteGameState, latencyGameState } from "./game-state/game-states";
import { InventoryData } from "webgl-test-shared";
import { removeSelectedItem, selectItem } from "./player-input";
// import { createItem } from "./items/item-creation";

const canInteractWithItemSlots = (): boolean => {
   return inventoryIsOpen() || interactInventoryIsOpen();
}

export function leftClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the inventory is open
   if (!canInteractWithItemSlots()) return;

   if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
      // There is an item in the item slot

      const clickedItem = inventory.itemSlots[itemSlot];

      // Attempt to pick up the item if there isn't a held item
      if (!definiteGameState.heldItemSlot!.itemSlots.hasOwnProperty(1)) {
         Client.sendItemPickupPacket(entityID, inventory.inventoryName, itemSlot, clickedItem.count);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to add the held item to the clicked item
         if (clickedItem.type === definiteGameState.heldItemSlot!.itemSlots[1].type) {
            Client.sendItemReleasePacket(entityID, inventory.inventoryName, itemSlot, definiteGameState.heldItemSlot!.itemSlots[1].count);
         }
      }
   } else {
      // There is no item in the item slot

      // Attempt to release the held item into the item slot if there is a held item
      if (definiteGameState.heldItemSlot!.itemSlots.hasOwnProperty(1)) {
         Client.sendItemReleasePacket(entityID, inventory.inventoryName, itemSlot, definiteGameState.heldItemSlot!.itemSlots[1].count);
      }
   }
}

export function rightClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the crafting menu is open
   if (!canInteractWithItemSlots()) return;

   if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
      const clickedItem = inventory.itemSlots[itemSlot];

      if (definiteGameState.heldItemSlot === null || !definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1)) {
         const numItemsInSlot = clickedItem.count;
         const pickupCount = Math.ceil(numItemsInSlot / 2);

         Client.sendItemPickupPacket(entityID, inventory.inventoryName, itemSlot, pickupCount);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to drop 1 of the held item
         if (clickedItem.type === definiteGameState.heldItemSlot.itemSlots[1].type) {
            Client.sendItemReleasePacket(entityID, inventory.inventoryName, itemSlot, 1);
         }
      }
   } else {
      // There is no item in the clicked item slot
      
      if (definiteGameState.heldItemSlot !== null) {
         // Attempt to place one of the held item into the clicked item slot
         Client.sendItemReleasePacket(entityID, inventory.inventoryName, itemSlot, 1);
      }
   }
}

export function updateInventoryFromData(inventory: Inventory, inventoryData: InventoryData): void {
   inventory.width = inventoryData.width;
   inventory.height = inventoryData.height;

   // Remove any items which have been removed from the inventory
   for (const [_itemSlot, item] of Object.entries(inventory.itemSlots)) {
      const itemSlot = Number(_itemSlot);
      // If it doesn't exist in the server data, remove it
      if (!inventoryData.itemSlots.hasOwnProperty(itemSlot) || inventoryData.itemSlots[itemSlot].id !== item.id) {
         // @Cleanup: hacky. Detects when items have been removed from the hotbar. This ideally shouldn't be done here,
         // because this code will run on ALL inventories which get updated from data while we only care about the hotbar.
         if (inventoryData.inventoryName === "hotbar" && itemSlot === latencyGameState.selectedHotbarItemSlot) {
            removeSelectedItem(item);
         }
         
         delete inventory.itemSlots[itemSlot];
      }
   }

   // Add all new items from the server data
   for (const [itemSlot, itemData] of Object.entries(inventoryData.itemSlots).map(([itemSlot, itemData]) => [Number(itemSlot), itemData] as const)) {
      // If the item doesn't exist in the inventory, add it
      if (!inventory.itemSlots.hasOwnProperty(itemSlot) || inventory.itemSlots[itemSlot].id !== itemData.id) {
         inventory.itemSlots[itemSlot] = new Item(itemData.type, itemData.count, itemData.id);

         // @Cleanup: hacky. (see other comment above)
         if (inventoryData.inventoryName === "hotbar" && itemSlot === latencyGameState.selectedHotbarItemSlot) {
            selectItem(inventory.itemSlots[itemSlot]);
         }
      } else {
         // Otherwise the item needs to be updated with the new server data
         inventory.itemSlots[itemSlot].count = itemData.count;
      }
   }
}

export function createInventoryFromData(inventoryData: InventoryData): Inventory {
   const itemSlots: ItemSlots = {};

   // Add all new items from the server data
   for (const [itemSlot, itemData] of Object.entries(inventoryData.itemSlots).map(([itemSlot, itemData]) => [Number(itemSlot), itemData] as const)) {
      // If the item doesn't exist in the inventory, add it
      itemSlots[Number(itemSlot)] = new Item(itemData.type, itemData.count, itemData.id);
   }
   
   const inventory: Inventory = {
      itemSlots: itemSlots,
      width: inventoryData.width,
      height: inventoryData.height,
      inventoryName: inventoryData.inventoryName
   };
   return inventory;
}