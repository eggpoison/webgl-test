import { useEffect, useState } from "react";
import { SETTINGS } from "webgl-test-shared";
import { Inventory } from "../../entities/Player";
import Item from "../../Item";
import ItemSlot from "./ItemSlot";

export let updateHotbarInventory: (inventory: Inventory) => void;

const Hotbar = () => {
   const [hotbarInventory, setHotbarInventory] = useState<Inventory>({});

   useEffect(() => {
      updateHotbarInventory = (inventory: Inventory): void => {
         setHotbarInventory(inventory);
      }
   }, []);

   // Create the item slots
   const itemSlots = new Array<JSX.Element>();
   for (let itemSlot = 1; itemSlot <= SETTINGS.PLAYER_ITEM_SLOTS; itemSlot++) {
      const item: Item | undefined = hotbarInventory[itemSlot];
      
      itemSlots.push(
         <ItemSlot picturedItemType={item?.type} itemCount={item?.count} key={itemSlot} />
      );
   }
   
   return <div id="hotbar" className="inventory-container">
      {itemSlots}
   </div>;
}

export default Hotbar;