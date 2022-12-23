import { ItemType } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";

interface ItemSlotParams {
   readonly picturedItemType?: ItemType;
   readonly isSelected: boolean;
   readonly itemCount?: number;
   readonly className?: string;
   readonly onClick?: (e: MouseEvent) => void;
   readonly onMouseOver?: (e: MouseEvent) => void;
   readonly onMouseOut?: () => void;
   readonly onMouseMove?: (e: MouseEvent) => void;
}

const ItemSlot = ({ picturedItemType, isSelected, itemCount, className, onClick, onMouseOver, onMouseOut, onMouseMove }: ItemSlotParams) => {
   return <div onMouseOver={typeof onMouseOver !== "undefined" ? e => onMouseOver(e.nativeEvent) : undefined} onMouseOut={onMouseOut} onMouseMove={typeof onMouseMove !== "undefined" ? e => onMouseMove(e.nativeEvent) : undefined} className={`item-slot${typeof className !== "undefined" ? " " + className : ""}${isSelected ? " selected" : ""}`} onClick={typeof onClick !== "undefined" ? e => onClick(e.nativeEvent) : undefined}>
      {typeof picturedItemType !== "undefined" ? (
         <img src={require("../../images/items/" + CLIENT_ITEM_INFO_RECORD[picturedItemType].textureSrc)} alt="" />
      ) : null}
      {typeof itemCount !== "undefined" ? (
         <div className="item-count">{itemCount}</div>
      ) : null}
   </div>;
}

export default ItemSlot;