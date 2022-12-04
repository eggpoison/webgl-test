import { io, Socket } from "socket.io-client";
import { AttackPacket, ClientToServerEvents, GameDataPacket, PlayerDataPacket, Point, ServerEntityData, ServerItemEntityData, ServerToClientEvents, SETTINGS, ServerTileUpdateData, Vector, ServerTileData, TileInfo, InitialPlayerDataPacket } from "webgl-test-shared";
import Camera from "../Camera";
import { setGameState, setLoadingScreenInitialStatus } from "../components/App";
import Player from "../entities/Player";
import ENTITY_CLASS_RECORD, { EntityClassType } from "../entity-class-record";
import Game from "../Game";
import Item from "../Item";
import { Tile } from "../Tile";

type ISocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type GameData = {
   readonly gameTicks: number;
   readonly tiles: Array<Array<Tile>>;
   readonly playerID: number;
}

/** Parses the server tile data array into an array of client tiles */
const parseServerTileDataArray = (serverTileDataArray: ReadonlyArray<ReadonlyArray<ServerTileData>>): Array<Array<Tile>> => {
   const tiles = new Array<Array<Tile>>();

   for (let y = 0; y < SETTINGS.BOARD_DIMENSIONS; y++) {
      tiles[y] = new Array<Tile>();
      for (let x = 0; x < SETTINGS.BOARD_DIMENSIONS; x++) {
         const serverTileData = serverTileDataArray[y][x];
         const tileInfo: TileInfo = {
            type: serverTileData.type,
            biome: serverTileData.biome,
            isWall: serverTileData.isWall
         }
         tiles[y][x] = new Tile(serverTileData.x, serverTileData.y, tileInfo);
      }
   }

   return tiles;
}

abstract class Client {
   private static socket: ISocket | null = null;

   public static connectToServer(): Promise<boolean> {
      return new Promise(resolve => {
         let socketAlreadyExists = false;

         // Don't add events if the socket already exists
         if (this.socket !== null) {
            socketAlreadyExists = true;
            
            // Reconnect
            if (!this.socket.connected) {
               this.socket.connect();
            }

            this.socket.off("connect");
            this.socket.off("connect_error");
         } else {
            // Create the socket
            this.socket = this.createSocket();
            this.socket.connect();
         }

         // If connection was successful, return true
         this.socket.on("connect", () => {
            resolve(true);
         });
         // If couldn't connect to server, return false
         this.socket.on("connect_error", () => {
            resolve(false);
         });
         
         if (!socketAlreadyExists) {
            this.socket.on("game_data_packet", gameDataPacket => {
               // Only unload game packets when the game is running
               if (Game.getIsPaused() || !Game.isRunning) return;
   
               this.unloadGameDataPacket(gameDataPacket);
   
               if (!Game.isSynced) {
                  Game.sync();
               }
            });
   
            // When the connection to the server fails
            this.socket.on("disconnect", () => {
               Game.isRunning = false;
   
               if (this.socket !== null) {
                  this.socket.disconnect();
               }
   
               setLoadingScreenInitialStatus("connection_error");
               setGameState("loading");
            });
         }
      });
   }

   public static async requestGameData(): Promise<GameData> {
      return new Promise(resolve => {
         if (this.socket === null) throw new Error("Socket hadn't been created when requesting game data")

         this.socket.emit("initial_game_data_request");
         
         this.socket.off("initial_game_data");
         this.socket.on("initial_game_data", (gameTicks: number, serverTileDataArray: ReadonlyArray<ReadonlyArray<ServerTileData>>, playerID: number) => {
            const tiles = parseServerTileDataArray(serverTileDataArray);

            Game.setTicks(gameTicks);
            
            const gameData: GameData = {
               gameTicks: gameTicks,
               tiles: tiles,
               playerID: playerID
            };

            resolve(gameData);
         });
      });
   }

   /** Creates the socket used to connect to the server */
   private static createSocket(): ISocket {
      return io(`ws://localhost:${SETTINGS.SERVER_PORT}`, {
         transports: ["websocket", "polling", "flashsocket"],
         autoConnect: false,
         reconnection: false
      });
   }

   private static unloadGameDataPacket(gameDataPacket: GameDataPacket): void {
      Game.setTicks(gameDataPacket.serverTicks);
      
      this.updateEntities(gameDataPacket.serverEntityDataArray);
      this.updateItems(gameDataPacket.serverItemDataArray);
      this.registerTileUpdates(gameDataPacket.tileUpdates);
   }

   /**
    * Updates the client's entities to match those in the server
    */
   private static updateEntities(entityDataArray: ReadonlyArray<ServerEntityData>): void {
      const clientKnownEntityIDs: Array<number> = Object.keys(Game.board.entities).map(idString => Number(idString));

      // Remove the player from the list of known entities so the player isn't removed
      clientKnownEntityIDs.splice(clientKnownEntityIDs.indexOf(Player.instance!.id), 1);

      // Update the game entities
      for (const entityData of entityDataArray) {
         // If it already exists, update it
         if (Game.board.entities.hasOwnProperty(entityData.id)) {
            Game.board.entities[entityData.id].updateFromData(entityData);
         } else {
            this.createEntityFromData(entityData);
         }

         clientKnownEntityIDs.splice(clientKnownEntityIDs.indexOf(entityData.id), 1);
      }

      // All remaining known entities must then have been removed
      for (const id of clientKnownEntityIDs) {
         Game.board.removeEntity(Game.board.entities[id]);
      }
   }

   private static updateItems(serverItemDataArray: ReadonlyArray<ServerItemEntityData>): void {
      const knownItemIDs = Object.keys(Game.board.items).map(stringID => Number(stringID));

      for (const serverItemData of serverItemDataArray) {
         if (!knownItemIDs.includes(serverItemData.id)) {
            // New item
            this.createItemFromServerItemData(serverItemData);
         } else {
            // Existing item
            this.updateItemFromServerItemData(serverItemData);
         }

         knownItemIDs.splice(knownItemIDs.indexOf(serverItemData.id), 1);
      }

      // Thus the remaining known item IDs have had their items removed
      for (const itemID of knownItemIDs) {
         Game.board.items[itemID].remove();
      }
   }

   private static createItemFromServerItemData(serverItemData: ServerItemEntityData): void {
      const position = Point.unpackage(serverItemData.position); 
      const containingChunks = serverItemData.chunkCoordinates.map(([x, y]) => Game.board.getChunk(x, y));
      new Item(serverItemData.id, position, containingChunks, serverItemData.itemID, serverItemData.count, serverItemData.rotation);
   }

   private static updateItemFromServerItemData(serverItemData: ServerItemEntityData): void {
      const item = Game.board.items[serverItemData.id];
      item.count = serverItemData.count;
   }

   private static registerTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const tileUpdate of tileUpdates) {
         const tile = Game.board.getTile(tileUpdate.x, tileUpdate.y);
         tile.type = tileUpdate.type;
         tile.isWall = tileUpdate.isWall;
      }
   }

   public static createEntityFromData(entityData: ServerEntityData): void {
      const position = Point.unpackage(entityData.position);

      // Create the entity
      const entityConstructor = ENTITY_CLASS_RECORD[entityData.type]() as EntityClassType<typeof entityData.type>;
      const entity = new entityConstructor(position, entityData.id, entityData.secondsSinceLastHit, ...entityData.clientArgs);
      
      entity.velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      entity.acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null
      entity.rotation = entityData.rotation;
      entity.special = entityData.special;
   }

   /**
    * Sends a message to all players in the server.
    * @param message The message to send to the other players
    */
   public static sendChatMessage(message: string): void {
      // Send the chat message to the server
      if (this.socket !== null) {
         this.socket.emit("chat_message", message);
      }
   }

   public static sendInitialPlayerData(initialPlayerDataPacket: InitialPlayerDataPacket): void {
      // Send player data to the server
      if (this.socket !== null) {
         this.socket.emit("initial_player_data_packet", initialPlayerDataPacket);
      }
   }

   public static sendPlayerDataPacket(): void {
      if (Game.isRunning && this.socket !== null) {
         const packet: PlayerDataPacket = {
            position: Player.instance!.position.package(),
            velocity: Player.instance!.velocity?.package() || null,
            acceleration: Player.instance!.acceleration?.package() || null,
            terminalVelocity: Player.instance!.terminalVelocity,
            rotation: Player.instance!.rotation,
            visibleChunkBounds: Camera.getVisibleChunkBounds()
         };

         this.socket.emit("player_data_packet", packet);
      }
   }

   public static sendAttackPacket(attackPacket: AttackPacket): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("attack_packet", attackPacket);
      }
   }
}

export default Client;