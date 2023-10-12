import { useEffect, useRef, useState } from "react";
import { InitialGameDataPacket, Point, TribeMemberAction, TribeType } from "webgl-test-shared";
import Board from "../Board";
import Client from "../client/Client";
import Player from "../entities/Player";
import Game from "../Game";
import { setGameState, setLoadingScreenInitialStatus } from "./App";
import Camera from "../Camera";
import { definiteGameState } from "../game-state/game-states";
import { calculateEntityRenderDepth } from "../render-layers";

// @Cleanup: This file does too much logic on its own. It should really only have UI/loading state

export type LoadingScreenStatus = "establishing_connection" | "receiving_spawn_position" | "sending_player_data" | "receiving_game_data" | "initialising_game" | "connection_error";

interface LoadingScreenProps {
   readonly username: string;
   readonly initialStatus: LoadingScreenStatus;
}
const LoadingScreen = ({ username, initialStatus }: LoadingScreenProps) => {
   const [status, setStatus] = useState<LoadingScreenStatus>(initialStatus);
   const initialGameDataPacketRef = useRef<InitialGameDataPacket | null>(null);
   const spawnPositionRef = useRef<Point | null>(null);
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
                     setStatus("receiving_spawn_position");
                  } else {
                     setStatus("connection_error");
                  }
               })();
            }

            break;
         }
         case "receiving_spawn_position": {
            (async () => {
               spawnPositionRef.current = await Client.requestSpawnPosition();

               setStatus("sending_player_data");
            })();

            break;
         }
         case "sending_player_data": {
            Camera.setCameraPosition(spawnPositionRef.current!);
            Camera.updateVisibleChunkBounds();
            Camera.updateVisibleRenderChunkBounds();
            Client.sendInitialPlayerData(username, Camera.getVisibleChunkBounds());

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
               const initialGameDataPacket = initialGameDataPacketRef.current!;

               const tiles = Client.parseServerTileDataArray(initialGameDataPacket.tiles);
               Board.initialise(tiles, initialGameDataPacket.waterRocks, initialGameDataPacket.riverSteppingStones, initialGameDataPacket.riverFlowDirections);

               await Game.initialise();

               // Spawn the player
               definiteGameState.playerUsername = username;
               const playerSpawnPosition = new Point(spawnPositionRef.current!.x, spawnPositionRef.current!.y);
               const renderDepth = calculateEntityRenderDepth("player");
               const player = new Player(playerSpawnPosition, new Set([Player.createNewPlayerHitbox()]), initialGameDataPacket.playerID, renderDepth, null, TribeType.plainspeople, {itemSlots: {}, width: 1, height: 1, inventoryName: "armourSlot"}, {itemSlots: {}, width: 1, height: 1, inventoryName: "backpackSlot"}, {itemSlots: {}, width: 1, height: 1, inventoryName: "backpack"}, null, TribeMemberAction.none, -1, -99999, username);
               Player.setInstancePlayer(player);
               Board.addEntity(player);

               Client.unloadGameDataPacket(initialGameDataPacket);

               Game.start();

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