import { useCallback, useEffect, useRef, useState } from "react";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import Item from "../../Item";

export let setHeldItemVisual: (heldItem: Item | null) => void;

export let setHeldItemVisualPosition: (xPixels: number, yPixels: number) => void;

const HeldItem = () => {
   const [heldItem, setHeldItem] = useState<Item | null>(null);
   const [mousePosition, setMousePosition] = useState<[number, number] | null>(null);
   const heldItemElementRef = useRef<HTMLDivElement | null>(null);
   const hasLoaded = useRef(false);

   const updateMousePosition = (e: MouseEvent): void => {
      setMousePosition([e.clientX, e.clientY]);
   }

   const onRefChange = useCallback((node: HTMLDivElement | null) => {
      if (node !== null) {
         heldItemElementRef.current = node;

         if (mousePosition !== null) {
            heldItemElementRef.current.style.left = mousePosition[0] + "px";
            heldItemElementRef.current.style.top = mousePosition[1] + "px";
         }
      }
   }, [mousePosition]);
   
   useEffect(() => {
      if (!hasLoaded.current) {
         // Update the position of the held item on mouse move
         document.addEventListener("mousemove", e => updateMousePosition(e));
         
         hasLoaded.current = true;
      }
      
      setHeldItemVisual = (heldItem: Item | null): void => {
         setHeldItem(heldItem);
      }

      setHeldItemVisualPosition = (xPixels: number, yPixels: number): void => {
         setMousePosition([xPixels, yPixels]);
      }
   }, []);

   useEffect(() => {
      if (heldItemElementRef.current !== null && mousePosition !== null) {
         heldItemElementRef.current.style.left = mousePosition[0] + "px";
         heldItemElementRef.current.style.top = mousePosition[1] + "px";
      }
   }, [mousePosition]);

   if (heldItem === null) return null;
   
   return <div id="held-item" ref={onRefChange}>
      <img src={require("../../images/items/" + CLIENT_ITEM_INFO_RECORD[heldItem.type].textureSrc)} alt="" />
   </div>;
}

export default HeldItem;