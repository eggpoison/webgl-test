import { useCallback, useEffect, useState } from "react";
import { ItemType } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import Client from "../../../client/Client";
import Item, { Inventory } from "../../../items/Item";
import { setHeldItemVisualPosition } from "../HeldItem";
import { inventoryIsOpen } from "../menus/CraftingMenu";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import Game from "../../../Game";
import ItemSlot from "./ItemSlot";
import Player from "../../../entities/Player";
import { BackpackInventoryMenu_setBackpackInventory } from "./BackpackInventory";
import { interactInventoryIsOpen } from "./InteractInventory";

export let Hotbar_updateHotbarInventory: (inventory: Inventory) => void = () => {};

/**
 * Updates the backpack item slot shown in the hotbar.
 */
export let Hotbar_updateBackpackItemSlot: (backpack: Item | null) => void = () => {};
export let Hotbar_updateArmourItemSlot: (inventory: Inventory) => void = () => {};

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void = () => {};

const backpackItemTypes: ReadonlyArray<ItemType> = [ItemType.leather_backpack, ItemType.raw_beef];

const Hotbar = () => {
   const [hotbarInventory, setHotbarInventory] = useState<Inventory | null>(null);
   const [backpackItemSlot, setBackpackItemSlot] = useState<Item | null>(null);
   const [armourInventory, setArmourInventory] = useState<Inventory | null>(null);
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);

   const equipBackpack = (backpackInventory: Inventory): void => {
      if (Player.instance === null) return;

      BackpackInventoryMenu_setBackpackInventory(backpackInventory);
   }
   
   const unequipBackpack = (): void => {
      BackpackInventoryMenu_setBackpackInventory(null);
   }

   const clickBackpackItemSlot = useCallback((e: MouseEvent): void => {
      // Item slots can only be interacted with while the crafting menu is open
      if (Player.instance === null || (!inventoryIsOpen() && !interactInventoryIsOpen())) return;

      if (backpackItemSlot !== null) {
         // There is an item in the backpack item slot

         // Attempt to pick the backpack up if there isn't a held item
         if (Game.definiteGameState.heldItemSlot === null) {
            Client.sendItemPickupPacket(Player.instance.id, "backpackItemSlot", -1, 1);
      
            setHeldItemVisualPosition(e.clientX, e.clientY);

            unequipBackpack();
         }
      } else {
         // There is no backpack in the backpack item slot

         // Attempt to put a backpack in the slot if there is a held item
         if (Game.definiteGameState.heldItemSlot !== null && backpackItemTypes.includes(Game.definiteGameState.heldItemSlot.itemSlots[1].type)) {
            Client.sendItemReleasePacket(Player.instance.id, "backpackItemSlot", -1, 1);

            // Note: at this point in time, the server hasn't registered that the player has equipped the backpack into the backpack item slot and so we need to get the item from the held item
            const backpack = Game.definiteGameState.heldItemSlot.itemSlots[1];
            if (backpack !== null) {
               equipBackpack(Game.definiteGameState.heldItemSlot);
            }
         }
      }
   }, [backpackItemSlot]);

   useEffect(() => {
      Hotbar_updateHotbarInventory = (inventory: Inventory): void => {
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

      Hotbar_updateArmourItemSlot = (inventory: Inventory): void => {
         setArmourInventory(inventory);
      }
   }, []);

   if (hotbarInventory === null) {
      return null;
   }

   // Create the item slots
   const hotbarItemSlots = new Array<JSX.Element>();
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item: Item | undefined = hotbarInventory.itemSlots[itemSlot];
      
      if (typeof item !== "undefined") {
         const imageSrc = require("../../../images/" + CLIENT_ITEM_INFO_RECORD[item.type].textureSource);
         hotbarItemSlots.push(
            <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, hotbarInventory, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, hotbarInventory, itemSlot)} isSelected={itemSlot === selectedItemSlot} picturedItemImageSrc={imageSrc} itemCount={item.count} key={itemSlot} />
         );
      } else {
         hotbarItemSlots.push(
            <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, hotbarInventory, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, hotbarInventory, itemSlot)} isSelected={itemSlot === selectedItemSlot} key={itemSlot} />
         );
      }
   }

   let backpackItemSlotElement: JSX.Element;
   if (backpackItemSlot !== null) {
      const backpackItemInfo = CLIENT_ITEM_INFO_RECORD[backpackItemSlot.type];
      
      const imageSrc = require("../../../images/items/" + backpackItemInfo.textureSource);
      backpackItemSlotElement = <ItemSlot onClick={e => clickBackpackItemSlot(e)} isSelected={false} picturedItemImageSrc={imageSrc} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/backpack-wireframe.png");
      backpackItemSlotElement = <ItemSlot onClick={e => clickBackpackItemSlot(e)} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   let armourItemSlotElement: JSX.Element;
   if (armourInventory !== null) {
      if (armourInventory.itemSlots.hasOwnProperty(1)) {
         const armourItemInfo = CLIENT_ITEM_INFO_RECORD[armourInventory.itemSlots[1].type];
         
         const imageSrc = require("../../../images/items/" + armourItemInfo.textureSource);
         armourItemSlotElement = <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, armourInventory, 1)} isSelected={false} picturedItemImageSrc={imageSrc} />
      } else {
         const imageSrc = require("../../../images/miscellaneous/armour-wireframe.png");
         armourItemSlotElement = <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, armourInventory, 1)} isSelected={false} picturedItemImageSrc={imageSrc} />
      }
   } else {
      const imageSrc = require("../../../images/miscellaneous/armour-wireframe.png");
      armourItemSlotElement = <ItemSlot isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   return <div id="hotbar">
      <div className="flex-balancer inventory">
         <ItemSlot isSelected={false} />
         {/* <ItemSlot isSelected={false} /> */}
      </div>

      <div className="inventory">
         {hotbarItemSlots}
      </div>

      <div id="special-item-slots" className="inventory">
         {backpackItemSlotElement}
         {/* {armourItemSlotElement} */}
      </div>
   </div>;
}

export default Hotbar;