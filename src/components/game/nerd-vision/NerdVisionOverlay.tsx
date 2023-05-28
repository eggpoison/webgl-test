import EntityViewer from "./EntityViewer";
import Terminal from "./Terminal";
import CursorTooltip from "./CursorTooltip";
import { useCallback, useEffect, useState } from "react";
import { addKeyListener } from "../../../keyboard-input";
import GameInfoDisplay from "./GameInfoDisplay";
import TerminalButton from "./TerminalButton";

export let showNerdVision: () => void;
export let hideNerdVision: () => void;

const NerdVisionOverlay = () => {
   const [isEnabled, setIsEnabled] = useState(false); // Nerd vision always starts as disabled
   const [terminalIsVisible, setTerminalIsVisible] = useState(false);

   // Initialise show and hide functions
   useEffect(() => {
      showNerdVision = (): void => {
         setIsEnabled(true);
      }
      
      hideNerdVision = (): void => {
         setIsEnabled(false);
      }
   }, []);

   const toggleTerminal = useCallback(() => {
      setTerminalIsVisible(!terminalIsVisible);
   }, [terminalIsVisible]);
   
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
      <TerminalButton onClick={toggleTerminal} isOpened={terminalIsVisible} />
      {terminalIsVisible ? <Terminal /> : null}
      <CursorTooltip />
   </div>;
}

export default NerdVisionOverlay;