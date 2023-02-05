import { useEffect, useRef, useState } from "react";
import { InitialGameDataPacket, Point } from "webgl-test-shared";
import Board from "../Board";
import Client from "../client/Client";
import Player from "../entities/Player";
import Game from "../Game";
import { setGameState, setLoadingScreenInitialStatus } from "./App";

export type LoadingScreenStatus = "establishing_connection" | "sending_player_data" | "receiving_game_data" | "initialising_game" | "connection_error";

interface LoadingScreenProps {
   readonly username: string;
   readonly initialStatus: LoadingScreenStatus;
}
const LoadingScreen = ({ username, initialStatus }: LoadingScreenProps) => {
   const [status, setStatus] = useState<LoadingScreenStatus>(initialStatus);
   const initialGameDataPacketRef = useRef<InitialGameDataPacket | null>(null);
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
                     setStatus("sending_player_data");
                  } else {
                     setStatus("connection_error");
                  }
               })();
            }

            break;
         }
         case "sending_player_data": {
            Client.sendInitialPlayerData(username);

            setStatus("receiving_game_data");
            
            break;
         }
         case "receiving_game_data": {
            (async () => {
               initialGameDataPacketRef.current = await Client.requestInitialGameData();

               setStatus("initialising_game");
            })();

            break;
         }
         case "initialising_game": {
            (async () => {
               const initialGameDataPacket =initialGameDataPacketRef.current!;

               if (!Game.hasInitialised) {
                  await Game.initialise();
               }

               const tiles = Client.parseServerTileDataArray(initialGameDataPacket.tiles);
               Game.board = new Board(tiles);

               // Spawn the player
               Player.username = username;
               const playerSpawnPosition = new Point(initialGameDataPacket.spawnPosition[0], initialGameDataPacket.spawnPosition[1]);
               new Player(playerSpawnPosition, new Set(Player.HITBOXES), initialGameDataPacket.playerID, null, username, true);

               Client.unloadGameDataPacket(initialGameDataPacket);

               setGameState("game");
            })();

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