import { useEffect, useRef, useState } from "react";
import { addKeyListener } from "../../../keyboard-input";

const CraftingMenu = () => {
   const [isVisible, setIsVisible] = useState(false);
   const hasLoaded = useRef(false);

   const openCraftingMenu = (): void => {
      setIsVisible(true);
   }

   useEffect(() => {
      if (!hasLoaded.current) {
         // Create the key listener for opening the crafting menu
         addKeyListener("e", () => openCraftingMenu());

         hasLoaded.current = true;
      }
   }, []);

   if (!isVisible) return null;
   
   return <div id="crafting-menu">

   </div>;
}

export default CraftingMenu;