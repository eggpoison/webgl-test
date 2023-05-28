import { useCallback, useEffect, useRef, useState } from "react";
import Game from "../../Game";
import ChatBox from "../ChatBox";
import NerdVisionOverlay from "./nerd-vision/NerdVisionOverlay";
import HealthBar from "./HealthBar";
import PauseScreen from "./PauseScreen";
import Settings from "./menus/Settings";
import Hotbar from "./Hotbar";
import CraftingMenu from "./menus/CraftingMenu";
import HeldItem from "./HeldItem";
import DeathScreen from "./DeathScreen";
import BackpackInventoryMenu from "./menus/BackpackInventory";

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

   toggleSettingsMenu = useCallback(() => {
      settingsIsOpen ? closeSettingsMenu() : openSettingsMenu();
   }, [settingsIsOpen]);
   
   return <>
      <ChatBox />

      <HealthBar />
      <Hotbar />

      {/* Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks */}
      <BackpackInventoryMenu />
      <CraftingMenu />

      <HeldItem />

      <DeathScreen isDead={isDead} />

      <NerdVisionOverlay />

      {settingsIsOpen ? <Settings /> : null}

      {isPaused && !isDead ? <PauseScreen /> : null}
   </>;
}

export default GameScreen;