import { useEffect, useRef, useState } from "react";
import { InitialPlayerDataPacket } from "webgl-test-shared";
import Camera from "../Camera";
import Client, { GameData } from "../client/Client";
import Player from "../entities/Player";
import Game from "../Game";
import { setGameState, setLoadingScreenInitialStatus } from "./App";

export type LoadingScreenStatus = "establishing_connection" | "receiving_game_data" | "sending_player_data" | "initialising_game" | "connection_error" | "server_disconnect";

interface LoadingScreenProps {
   readonly username: string;
   readonly initialStatus: LoadingScreenStatus;
}
const LoadingScreen = ({ username, initialStatus }: LoadingScreenProps) => {
   const [status, setStatus] = useState<LoadingScreenStatus>(initialStatus);
   const gameDataRef = useRef<GameData | null>(null);

   const openMainMenu = (): void => {
      setLoadingScreenInitialStatus("establishing_connection");
      setGameState("main_menu");
   }

   // Begin connection with server
   useEffect(() => {
      if (status !== "server_disconnect" && !Client.hasConnected()) {
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
   }, [status]);

   useEffect(() => {
      switch (status) {
         case "receiving_game_data": {
            (async () => {
               gameDataRef.current = await Client.receiveGameData();

               setStatus("sending_player_data");
            })();

            break;
         }
         case "sending_player_data": {
            // Spawn the player
            const playerID = gameDataRef.current!.playerID;
            Game.spawnPlayer(username, playerID);

            const visibleChunkBounds = Camera.calculateVisibleChunkBounds();
            const initialPlayerDataPacket: InitialPlayerDataPacket = {
               username: username,
               position: Player.instance.position.package(),
               visibleChunkBounds: visibleChunkBounds
            };
            Client.sendInitialPlayerData(initialPlayerDataPacket);

            setStatus("initialising_game");

            break;
         }
         case "initialising_game": {
            (async () => {
               if (gameDataRef.current === null) throw new Error("No game data was present when attempting to initialise the game");
   
               await Game.initialise(gameDataRef.current);

               setGameState("game");
            })();

            break;
         }
      }
   }, [status, username]);

   if (status === "server_disconnect") {
      return <div id="loading-screen">
         <div className="content">
            <h1 className="title">Error</h1>
            
            <div className="loading-message">
               <p>Connection with server failed.</p>
               <button onClick={openMainMenu}>OK</button>
            </div>
         </div>
      </div>;
   }

   return <div id="loading-screen">
      <div className="content">
         <h1 className="title">
            {status === "connection_error" ? <>
               Well frick
            </> : <>
               Loading
            </>}
         </h1>

         {status === "establishing_connection" ? <>
            <div className="loading-message">
               <p>Establishing connection with server...</p>
            </div>
         </> : status === "sending_player_data" ? <>
            <div className="loading-message">
               <p>Sending player data...</p>
            </div>
         </> : status === "initialising_game" ? <>
            <div className="loading-message">
               <p>Initialising game...</p>
            </div>
         </> : status === "connection_error" ? <>
            <div className="loading-message">
               <p>Error while connecting to server.</p>
               <button onClick={openMainMenu}>Back</button>
            </div>
         </> : null}
      </div>
   </div>;
}

export default LoadingScreen;