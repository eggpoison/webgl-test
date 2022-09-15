import { useEffect, useRef, useState } from "react";
import { loadGame } from "..";
import Client from "../client/Client";
import ChatBox from "./ChatBox";
import NameInput from "./NameInput";
import PauseScreen from "./PauseScreen";
import Settings from "./Settings";

export enum GameState {
   nameInput,
   connecting,
   game,
   error
}

let setGameStateReference: (gameState: GameState) => Promise<void>;
export function setGameState(gameState: GameState): Promise<void> {
   return setGameStateReference(gameState);
}

let setGameMessageReference: (message: string) => void;
export function setGameMessage(message: string): void {
   setGameMessageReference(message);
}

let getGameStateReference: () => GameState;
export function getGameState(): GameState {
   return getGameStateReference();
}

let settingsIsOpenReference: () => boolean;
export function settingsIsOpen(): boolean {
   return settingsIsOpenReference();
}

let openSettingsReference: () => void;
export function openSettings(): void {
   openSettingsReference();
}

let fullyCloseSettingsReference: () => void;
export function fullyCloseSettings(): void {
   fullyCloseSettingsReference();
}

let showPauseScreenReference: () => void;
export function showPauseScreen(): void {
   showPauseScreenReference();
}

let hidePauseScreenReference: () => void;
export function hidePauseScreen(): void {
   hidePauseScreenReference();
}

function App() {
   const [gameState, setGameState] = useState<GameState>(GameState.nameInput);
   const [gameMessage, setGameMessage] = useState<string>("");
   const [settingsIsOpen, setSettingsIsOpen] = useState(false);
   const [isPaused, setIsPaused] = useState(false);
   const hasLoaded = useRef<boolean>(false);
   const gameStateUpdateCallbacks = useRef<Array<() => void>>([]);

   useEffect(() => {
      if (!hasLoaded.current) {
         hasLoaded.current = true;
         loadGame();
      }

      setGameStateReference = (gameState: GameState): Promise<void> => {
         return new Promise(resolve => {
            gameStateUpdateCallbacks.current.push(resolve);

            setGameState(gameState);
         });
      }

      setGameMessageReference = (gameMessage: string): void => {
         setGameMessage(gameMessage);
      }

      openSettingsReference = (): void => setSettingsIsOpen(true);
      fullyCloseSettingsReference = (): void => setSettingsIsOpen(false);

      showPauseScreenReference = (): void => setIsPaused(true);
      hidePauseScreenReference = (): void => setIsPaused(false);
   }, []);

   useEffect(() => {
      settingsIsOpenReference = (): boolean => settingsIsOpen;
   }, [settingsIsOpen]);

   useEffect(() => {
      // Call all callbacks
      for (const callback of gameStateUpdateCallbacks.current) {
         callback();
      }
      gameStateUpdateCallbacks.current = [];
   }, [gameState]);

   useEffect(() => {
      getGameStateReference = (): GameState => {
         return gameState;
      }
   }, [gameState]);

   return <>
      {gameState === GameState.nameInput ? <>
         <NameInput />
      </> : null}

      {gameState === GameState.connecting ? <div className="game-message">
         <p>{gameMessage}</p>
      </div> : null}

      {gameState === GameState.error ? <div className="game-message">
         <p>Error connecting to server</p>
         <button onClick={Client.attemptReconnect}>Reconnect</button>
      </div> : null}

      {gameState === GameState.game ? <>
         <ChatBox />

         <canvas id="game-canvas"></canvas>
         <canvas id="text-canvas"></canvas>

         {settingsIsOpen ? <Settings /> : null}

         {isPaused ? <PauseScreen /> : null}
      </> : null}
   </>;
}

export default App;
