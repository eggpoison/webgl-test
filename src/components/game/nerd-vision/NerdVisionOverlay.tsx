import EntityViewer from "./EntityViewer";
import Terminal from "./Terminal";
import CursorTooltip from "./CursorTooltip";
import { useEffect, useState } from "react";
import { addKeyListener } from "../../../keyboard-input";
import GameInfoDisplay from "./GameInfoDisplay";

export let showNerdVision: () => void;
export let hideNerdVision: () => void;

const NerdVisionOverlay = () => {
   const [isEnabled, setIsEnabled] = useState(false); // Nerd vision always starts as disabled

   // Initialise show and hide functions
   useEffect(() => {
      showNerdVision = (): void => {
         setIsEnabled(true);
      }
      
      hideNerdVision = (): void => {
         setIsEnabled(false);
      }
   }, []);
   
   // Toggle nerd vision when the back quote key is pressed
   useEffect(() => {
      addKeyListener("`", () => {
         setIsEnabled(!isEnabled);
      }, "dev_view_is_enabled");
   }, [isEnabled]);

   if (!isEnabled) return null;

   return <div id="nerd-vision-wrapper">
      <GameInfoDisplay />
      <EntityViewer />
      <Terminal />
      <CursorTooltip />
   </div>;
}

export default NerdVisionOverlay;