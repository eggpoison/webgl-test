import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import { Inventory } from "../../../items/Item";
import ItemSlot from "./ItemSlot";

interface InventoryProps {
   readonly inventory: Inventory;
   readonly className?: string;
}

const InventoryContainer = ({ inventory, className }: InventoryProps) => {
   const itemSlots = new Array<JSX.Element>();
   
   for (let y = 0; y < inventory.height; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < inventory.width; x++) {
         const itemSlot = y * inventory.width + x + 1;

         if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
            const item = inventory.itemSlots[itemSlot];

            const itemImageSrc = require(`../../../images/items/${CLIENT_ITEM_INFO_RECORD[item.type].textureSource}`);

            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickItemSlot(e, inventory, itemSlot)} onContextMenu={e => rightClickItemSlot(e, inventory, itemSlot)} picturedItemImageSrc={itemImageSrc} itemCount={item.count} isSelected={false} />
            );
         } else {
            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickItemSlot(e, inventory, itemSlot)} onContextMenu={e => rightClickItemSlot(e, inventory, itemSlot)} isSelected={false} />
            );
         }
      }
      
      itemSlots.push(
         <div key={y} className="inventory-row">
            {rowItemSlots}
         </div>
      );
   }

   return <div className={className !== "undefined" ? `inventory-container ${className}` : undefined}>
      {itemSlots}
   </div>;
}

export default InventoryContainer;