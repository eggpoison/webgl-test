import { useCallback, useEffect, useRef, useState } from "react";
import ChatBox from "./ChatBox";
import NerdVision from "./dev/NerdVision";
import HealthBar from "./HealthBar";
import PauseScreen from "./PauseScreen";
import Hotbar from "./inventories/Hotbar";
import CraftingMenu from "./menus/CraftingMenu";
import HeldItem from "./HeldItem";
import DeathScreen from "./DeathScreen";
import BackpackInventoryMenu from "./inventories/BackpackInventory";
import InteractInventory from "./inventories/InteractInventory";
import ChargeMeter from "./ChargeMeter";

export let showPauseScreen: () => void = () => {};
export let hidePauseScreen: () => void = () => {};

export let openSettingsMenu: () => void;
export let closeSettingsMenu: () => void;
export let toggleSettingsMenu: () => void;

export let toggleCinematicMode: () => void;

export let gameScreenSetIsDead: (isDead: boolean) => void;

const GameScreen = () => {
   const hasLoaded = useRef<boolean>(false);
   const [isPaused, setIsPaused] = useState(false);
   const [settingsIsOpen, setSettingsIsOpen] = useState(false);
   const [isDead, setIsDead] = useState(false);
   const [cinematicModeIsEnabled, setCinematicModeIsEnabled] = useState(false);

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
      }
   }, []);

   useEffect(() => {
      if (cinematicModeIsEnabled) {
         toggleCinematicMode = () => {
            setCinematicModeIsEnabled(false);
         }
      } else {
         toggleCinematicMode = () => {
            setCinematicModeIsEnabled(true);
         }
      }
   }, [cinematicModeIsEnabled]);

   toggleSettingsMenu = useCallback(() => {
      settingsIsOpen ? closeSettingsMenu() : openSettingsMenu();
   }, [settingsIsOpen]);
   
   return <>
      <ChatBox />

      {!cinematicModeIsEnabled ? <>
         <HealthBar />
         <Hotbar />
      </> : undefined}

      {/* Note: BackpackInventoryMenu must be exactly before CraftingMenu because of CSS hijinks */}
      <BackpackInventoryMenu />
      <CraftingMenu />
      <InteractInventory />

      <HeldItem />
      <ChargeMeter />

      {isDead ? (
         <DeathScreen />
      ) : undefined}

      <NerdVision />

      {isPaused && !isDead ? <PauseScreen /> : null}
   </>;
}

export default GameScreen;