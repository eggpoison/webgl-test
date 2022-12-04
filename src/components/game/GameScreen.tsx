import { useCallback, useEffect, useRef, useState } from "react";
import Game from "../../Game";
import ChatBox from "../ChatBox";
import CursorTooltip from "../CursorTooltip";
import DevEntityViewer from "../DevEntityViewer";
import HealthBar from "./HealthBar";
import PauseScreen from "./PauseScreen";
import Settings from "./Settings";

// type GameMessageIdentifier = "server_disconnect";

// const GAME_MESSAGE_IDENTIFIERS: Record<GameMessageIdentifier, JSX.Element> = {
   
// };

export let showPauseScreen: () => void;
export let hidePauseScreen: () => void;
export let togglePauseScreen: () => void;

export let openSettingsMenu: () => void;
export let closeSettingsMenu: () => void;
export let toggleSettingsMenu: () => void;

const GameScreen = () => {
   const hasLoaded = useRef<boolean>(false);
   const [isPaused, setIsPaused] = useState(false);
   const [settingsIsOpen, setSettingsIsOpen] = useState(false);

   useEffect(() => {
      if (!hasLoaded.current) {
         hasLoaded.current = true;
         showPauseScreen = (): void => setIsPaused(true);
         hidePauseScreen = (): void => setIsPaused(false);
         
         openSettingsMenu = (): void => setSettingsIsOpen(true);
         closeSettingsMenu = (): void => setSettingsIsOpen(false);
         
         Game.start();
      }
   }, []);

   togglePauseScreen = useCallback(() => {
      isPaused ? hidePauseScreen() : hidePauseScreen();
   }, [isPaused]);

   toggleSettingsMenu = useCallback(() => {
      settingsIsOpen ? closeSettingsMenu() : openSettingsMenu();
   }, [settingsIsOpen]);
   
   return <>
      <ChatBox />

      <CursorTooltip />

      <DevEntityViewer />

      <HealthBar />

      {settingsIsOpen ? <Settings /> : null}

      {isPaused ? <PauseScreen /> : null}
   </>;
}

export default GameScreen;