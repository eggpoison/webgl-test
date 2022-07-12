import { useEffect, useRef, useState } from "react";
import { loadGame } from ".";
import ChatBox from "./components/ChatBox";
import NameInput from "./components/NameInput";

export enum GameState {
   nameInput,
   connecting,
   game
}

let setGameStateReference: (gameState: GameState) => Promise<void>;
export function setGameState(gameState: GameState): Promise<void> {
   return setGameStateReference(gameState);
}

let getGameStateReference: () => GameState;
export function getGameState(): GameState {
   return getGameStateReference();
}

function App() {
   const [gameState, setGameState] = useState<GameState>(GameState.nameInput);
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
   }, []);

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

      {gameState === GameState.connecting ? <>
         <div className="game-message">Connecting to server...</div>
      </> : null}

      {gameState === GameState.game ? <>
         <ChatBox />

         <canvas id="game-canvas"></canvas>
         <canvas id="text-canvas"></canvas>
      </> : null}
   </>;
}

export default App;
