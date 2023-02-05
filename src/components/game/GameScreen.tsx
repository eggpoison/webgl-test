import { useCallback, useEffect, useRef, useState } from "react";
import Game from "../../Game";
import { addKeyListener } from "../../keyboard-input";
import { isDev } from "../../utils";
import ChatBox from "../ChatBox";
import CursorTooltip from "../CursorTooltip";
import DevEntityViewer from "./DevEntityViewer";
import DebugScreen from "./DebugScreen";
import HealthBar from "./HealthBar";
import PauseScreen from "./PauseScreen";
import Settings from "./menus/Settings";
import Hotbar from "./Hotbar";
import CraftingMenu from "./menus/CraftingMenu";
import HeldItem from "./HeldItem";
import DeathScreen from "./DeathScreen";

export let showPauseScreen: () => void;
export let hidePauseScreen: () => void;

export let openSettingsMenu: () => void;
export let closeSettingsMenu: () => void;
export let toggleSettingsMenu: () => void;

export let gameScreenSetIsDead: (isDead: boolean) => void;

const GameScreen = () => {
   const hasLoaded = useRef<boolean>(false);
   const [isPaused, setIsPaused] = useState(false);
   const [settingsIsOpen, setSettingsIsOpen] = useState(false);
   const [devViewIsEnabled, setDevViewIsEnabled] = useState(isDev());
   const [isDead, setIsDead] = useState(false);

   useEffect(() => {
      if (!hasLoaded.current) {
         hasLoaded.current = true;

         showPauseScreen = (): void => setIsPaused(true);
         hidePauseScreen = (): void => setIsPaused(false);
         
         openSettingsMenu = (): void => setSettingsIsOpen(true);
         closeSettingsMenu = (): void => setSettingsIsOpen(false);

         gameScreenSetIsDead = (isDead: boolean): void => {
            setIsDead(isDead);
         }
         
         Game.start();
      }
   }, []);

   useEffect(() => {
      addKeyListener("`", () => {
         setDevViewIsEnabled(!devViewIsEnabled);
      }, "dev_view_is_enabled");
   }, [devViewIsEnabled]);

   useEffect(() => {
      
   }, [devViewIsEnabled]);

   toggleSettingsMenu = useCallback(() => {
      settingsIsOpen ? closeSettingsMenu() : openSettingsMenu();
   }, [settingsIsOpen]);
   
   return <>
      <ChatBox />

      <HealthBar />
      <Hotbar />

      <CraftingMenu />
      <HeldItem />

      <DeathScreen isDead={isDead} />

      {devViewIsEnabled ? <>
         <DevEntityViewer />
         <DebugScreen />
         <CursorTooltip />
      </> : null}

      {settingsIsOpen ? <Settings /> : null}

      {isPaused && !isDead ? <PauseScreen /> : null}
   </>;
}

export default GameScreen;