import EntityViewer from "./EntityViewer";
import Terminal, { forceTerminalFocus, setTerminalVisibility } from "./Terminal";
import CursorTooltip from "./CursorTooltip";
import { useEffect, useState } from "react";
import { addKeyListener } from "../../../keyboard-input";
import GameInfoDisplay from "./GameInfoDisplay";
import TerminalButton, { setTerminalButtonOpened } from "./TerminalButton";
import FrameGraph from "./FrameGraph";

export let showNerdVision: () => void;
export let hideNerdVision: () => void;

export let nerdVisionIsVisible: () => boolean = () => false;

const NerdVision = () => {
   const [terminalStartingVisibility, setTerminalStartingVisibility] = useState(false);
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

   useEffect(() => {
      addKeyListener("~", (e: KeyboardEvent) => {
         if (isEnabled) {
            e.preventDefault();

            setTerminalStartingVisibility(true);
            setTerminalVisibility(true);
            forceTerminalFocus();
            setTerminalButtonOpened(true);
         } else {
            e.preventDefault();
            
            setTerminalStartingVisibility(true);
            setIsEnabled(true);
         }
      }, "terminal_quick_open");
   }, [isEnabled]);

   useEffect(() => {
      nerdVisionIsVisible = () => isEnabled;
   }, [isEnabled])
   
   // Toggle nerd vision when the back quote key is pressed
   useEffect(() => {
      addKeyListener("`", () => {
         setTerminalStartingVisibility(false);
         setIsEnabled(!isEnabled);
      }, "dev_view_is_enabled");
   }, [isEnabled]);

   if (!isEnabled) return null;

   return <div id="nerd-vision-wrapper">
      <GameInfoDisplay />
      <EntityViewer />
      <TerminalButton startingIsOpened={terminalStartingVisibility} />
      <Terminal startingIsVisible={terminalStartingVisibility}/>
      <CursorTooltip />
      <FrameGraph />
   </div>;
}

export default NerdVision;