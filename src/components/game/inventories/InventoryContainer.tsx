import { getItemTypeImage } from "../../../client-item-info";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import { Inventory } from "../../../items/Item";
import ItemSlot from "./ItemSlot";

interface InventoryProps {
   readonly entityID: number;
   readonly inventory: Inventory;
   readonly className?: string;
   readonly selectedItemSlot?: number;
}

const InventoryContainer = ({ entityID, inventory, className, selectedItemSlot }: InventoryProps) => {
   const itemSlots = new Array<JSX.Element>();
   
   for (let y = 0; y < inventory.height; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < inventory.width; x++) {
         const itemSlot = y * inventory.width + x + 1;

         const isSelected = typeof selectedItemSlot !== "undefined" && itemSlot=== selectedItemSlot;
         if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
            const item = inventory.itemSlots[itemSlot];

            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickItemSlot(e, entityID, inventory, itemSlot)} onContextMenu={e => rightClickItemSlot(e, entityID, inventory, itemSlot)} picturedItemImageSrc={getItemTypeImage(item.type)} itemCount={item.count} isSelected={isSelected} />
            );
         } else {
            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickItemSlot(e, entityID, inventory, itemSlot)} onContextMenu={e => rightClickItemSlot(e, entityID, inventory, itemSlot)} isSelected={isSelected} />
            );
         }
      }
      
      itemSlots.push(
         <div key={y} className="inventory-row">
            {rowItemSlots}
         </div>
      );
   }

   return <div className={className !== "undefined" ? `inventory-container ${className}` : "inventory-container"}>
      {itemSlots}
   </div>;
}

export default InventoryContainer;