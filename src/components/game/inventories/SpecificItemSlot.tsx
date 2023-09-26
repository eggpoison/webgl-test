import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../client-item-info";
import Item from "../../../items/Item";
import ItemSlot, { ItemSlotParams } from "./ItemSlot";

interface SpecificItemSlotParams extends ItemSlotParams {
   readonly item: Item | null;
   canDropItem?(): void;
}

// @Incomplete: Make better system and actually use

const SpecificItemSlot = ({ item, isSelected, className, onClick, onMouseOver, onMouseOut, onMouseMove, onMouseDown, onContextMenu, canDropItem }: SpecificItemSlotParams) => {
   let picturedItemImageSrc: string | undefined;
   let itemCount: number | undefined;
   if (item !== null) {
      picturedItemImageSrc = getItemTypeImage(item.type);
      itemCount = item.count;
   }
   
   return <ItemSlot picturedItemImageSrc={picturedItemImageSrc} isSelected={isSelected} itemCount={itemCount} className={className} onClick={onClick} onMouseOver={onMouseOver} onMouseOut={onMouseOut} onMouseMove={onMouseMove} onMouseDown={onMouseDown} onContextMenu={onContextMenu} />
}

export default SpecificItemSlot;