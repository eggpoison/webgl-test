import { useEffect, useRef, useState } from "react";
import { EntityType, InitialGameDataPacket, Point, TribeMemberAction, TribeType, randInt } from "webgl-test-shared";
import Board from "../Board";
import Client from "../client/Client";
import Player from "../entities/Player";
import Game from "../Game";
import { setGameState, setLoadingScreenInitialStatus } from "./App";
import Camera from "../Camera";
import { definiteGameState } from "../game-state/game-states";
import { calculateEntityRenderDepth } from "../render-layers";
import Tribe from "../Tribe";

// @Cleanup: This file does too much logic on its own. It should really only have UI/loading state

export type LoadingScreenStatus = "establishing_connection" | "sending_player_data" | "receiving_spawn_position" | "sending_visible_chunk_bounds" | "receiving_game_data" | "initialising_game" | "connection_error";

interface LoadingScreenProps {
   readonly username: string;
   readonly tribeType: TribeType;
   readonly initialStatus: LoadingScreenStatus;
}
const LoadingScreen = ({ username, tribeType, initialStatus }: LoadingScreenProps) => {
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
                     setStatus("sending_player_data");
                  } else {
                     setStatus("connection_error");
                  }
               })();
            }

            break;
         }
         case "sending_player_data": {
            Client.sendInitialPlayerData(username, tribeType);

            setStatus("receiving_spawn_position");
            
            break;
         }
         case "receiving_spawn_position": {
            (async () => {
               spawnPositionRef.current = await Client.requestSpawnPosition();

               setStatus("sending_visible_chunk_bounds");
            })();

            break;
         }
         case "sending_visible_chunk_bounds": {
            Camera.setCameraPosition(spawnPositionRef.current!);
            Camera.updateVisibleChunkBounds();
            Camera.updateVisibleRenderChunkBounds();
            Client.sendVisibleChunkBounds(Camera.getVisibleChunkBounds());

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

               Game.tribe = new Tribe(tribeType, initialGameDataPacket.tribeData.numHuts);

               const tiles = Client.parseServerTileDataArray(initialGameDataPacket.tiles);
               await Game.initialise(tiles, initialGameDataPacket.waterRocks, initialGameDataPacket.riverSteppingStones, initialGameDataPacket.riverFlowDirections, initialGameDataPacket.edgeTiles, initialGameDataPacket.edgeRiverFlowDirections, initialGameDataPacket.edgeRiverSteppingStones, initialGameDataPacket.grassInfo, initialGameDataPacket.decorations);

               // Spawn the player
               definiteGameState.playerUsername = username;
               const playerSpawnPosition = new Point(spawnPositionRef.current!.x, spawnPositionRef.current!.y);
               const renderDepth = calculateEntityRenderDepth(EntityType.player);
               // @Cleanup: Copy and paste from Client
               const player = new Player(playerSpawnPosition, initialGameDataPacket.playerID, renderDepth, null, tribeType, {itemSlots: {}, width: 1, height: 1, inventoryName: "armourSlot"}, {itemSlots: {}, width: 1, height: 1, inventoryName: "backpackSlot"}, {itemSlots: {}, width: 1, height: 1, inventoryName: "backpack"}, null, TribeMemberAction.none, -1, -99999, -1, null, TribeMemberAction.none, -1, -99999, -1, false, tribeType === TribeType.goblins ? randInt(1, 5) : -1, username);
               player.addCircularHitbox(Player.createNewPlayerHitbox());
               Player.setInstancePlayer(player);
               Board.addEntity(player);

               Client.unloadGameDataPacket(initialGameDataPacket);

               Game.start();

               setGameState("game");
            })();

            break;
         }
      }
   }, [status, username, tribeType]);

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