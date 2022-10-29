import { useEffect, useRef, useState } from "react";
import { InitialPlayerDataPacket } from "webgl-test-shared";
import Camera from "../Camera";
import Client, { GameData } from "../client/Client";
import Player from "../entities/Player";
import Game from "../Game";
import { setGameState, setLoadingScreenInitialStatus } from "./App";

export type LoadingScreenStatus = "establishing_connection" | "receiving_game_data" | "sending_player_data" | "initialising_game" | "connection_error";

interface LoadingScreenProps {
   readonly username: string;
   readonly initialStatus: LoadingScreenStatus;
}
const LoadingScreen = ({ username, initialStatus }: LoadingScreenProps) => {
   const [status, setStatus] = useState<LoadingScreenStatus>(initialStatus);
   const gameDataRef = useRef<GameData | null>(null);
   const hasStarted = useRef(false);

   const openMainMenu = (): void => {
      setLoadingScreenInitialStatus("establishing_connection");
      setGameState("main_menu");
   }

   const reconnect = (): void => {
      hasStarted.current = false;
      setStatus("establishing_connection");
   }

   useEffect(() => {
      switch (status) {
         // Begin connection with server
         case "establishing_connection": {
            if (!hasStarted.current) {
               hasStarted.current = true;

               // Why must react be this way, this syntax is a national tragedy
               (async () => {
                  const connectionWasSuccessful = await Client.connectToServer();
                  if (connectionWasSuccessful) {
                     setStatus("receiving_game_data");
                  } else {
                     setStatus("connection_error");
                  }
               })();
            }

            break;
         }
         case "receiving_game_data": {
            (async () => {
               gameDataRef.current = await Client.requestGameData();

               setStatus("initialising_game");
            })();

            break;
         }
         case "initialising_game": {
            (async () => {
               await Game.initialise(gameDataRef.current!, username);

               setStatus("sending_player_data");
            })();

            break;
         }
         case "sending_player_data": {
            const visibleChunkBounds = Camera.calculateVisibleChunkBounds();
            
            const initialPlayerDataPacket: InitialPlayerDataPacket = {
               username: username,
               position: Player.instance!.position.package(),
               visibleChunkBounds: visibleChunkBounds
            };
            Client.sendInitialPlayerData(initialPlayerDataPacket);

            setGameState("game");

            break;
         }
      }
   }, [status, username]);

   if (status === "connection_error") {
      return <div id="loading-screen">
         <div className="content">
            <h1 className="title">Error while connecting to server.</h1>
            
            <div className="loading-message">
               <p>Connection with server failed.</p>

               <button onClick={reconnect}>Reconnect</button>
               <button onClick={() => openMainMenu()}>Back</button>
            </div>
         </div>
      </div>;
   }

   return <div id="loading-screen">
      <div className="content">
         <h1 className="title">Loading</h1>

         {status === "establishing_connection" ? <>
            <div className="loading-message">
               <p>Establishing connection with server...</p>
            </div>
         </> : status === "receiving_game_data" ? <>
            <div className="loading-message">
               <p>Receiving game data...</p>
            </div>
         </> : status === "sending_player_data" ? <>
            <div className="loading-message">
               <p>Sending player data...</p>
            </div>
         </> : status === "initialising_game" ? <>
            <div className="loading-message">
               <p>Initialising game...</p>
            </div>
         </> : null}
      </div>
   </div>;
}

export default LoadingScreen;