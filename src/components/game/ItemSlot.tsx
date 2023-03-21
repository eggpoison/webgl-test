interface ItemSlotParams {
   readonly picturedItemImageSrc?: any;
   readonly isSelected: boolean;
   readonly itemCount?: number;
   readonly className?: string;
   readonly onClick?: (e: MouseEvent) => void;
   readonly onMouseDown?: (e: MouseEvent) => void;
   readonly onMouseOver?: (e: MouseEvent) => void;
   readonly onMouseOut?: () => void;
   readonly onMouseMove?: (e: MouseEvent) => void;
}

const ItemSlot = ({ picturedItemImageSrc, isSelected, itemCount, className, onClick, onMouseOver, onMouseOut, onMouseMove, onMouseDown }: ItemSlotParams) => {
   return <div onMouseOver={typeof onMouseOver !== "undefined" ? e => onMouseOver(e.nativeEvent) : undefined} onMouseOut={onMouseOut} onMouseMove={typeof onMouseMove !== "undefined" ? e => onMouseMove(e.nativeEvent) : undefined} className={`item-slot${typeof className !== "undefined" ? " " + className : ""}${isSelected ? " selected" : ""}${typeof picturedItemImageSrc === "undefined" ? " empty" : ""}`} onClick={typeof onClick !== "undefined" ? e => onClick(e.nativeEvent) : undefined} onMouseDown={typeof onMouseDown !== "undefined" ? e => onMouseDown(e.nativeEvent) : undefined}>
      {typeof picturedItemImageSrc !== "undefined" ? (
         <img src={picturedItemImageSrc} draggable={false} alt="" />
      ) : null}
      {typeof itemCount !== "undefined" ? (
         <div className="item-count">{itemCount}</div>
      ) : null}
   </div>;
}

export default ItemSlot;