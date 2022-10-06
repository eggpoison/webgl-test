import { io, Socket } from "socket.io-client";
import { AttackPacket, ClientToServerEvents, GameDataPacket, PlayerDataPacket, Point, ServerAttackData, ServerEntityData, ServerItemData, ServerToClientEvents, SETTINGS, ServerTileUpdateData, Vector, ServerTileData, TileInfo, InitialPlayerDataPacket } from "webgl-test-shared";
import Board from "../Board";
import Camera from "../Camera";
import { setGameState, setLoadingScreenInitialStatus } from "../components/App";
import Player from "../entities/Player";
import ENTITY_CLASS_RECORD from "../entity-class-record";
import Game, { ClientAttackInfo as AttackInfo } from "../Game";
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

const parseServerAttackDataArray = (serverAttackInfoArray: ReadonlyArray<ServerAttackData>): ReadonlyArray<AttackInfo> => {
   // Don't consider attacks where the target entity isn't visible
   const filteredServerAttackInfoArray = serverAttackInfoArray.filter(serverAttackInfo => {
      return Board.entities.hasOwnProperty(serverAttackInfo.targetEntityID);
   });

   return filteredServerAttackInfoArray.map(serverAttackInfo => {
      return {
         targetEntity: Board.entities[serverAttackInfo.targetEntityID],
         progress: serverAttackInfo.progress
      };
   });
}

abstract class Client {
   private static socket: ISocket | null = null;

   private static gameDataResponse: Promise<GameData>;

   public static hasConnected(): boolean {
      return this.socket !== null;
   }

   public static connectToServer(): Promise<boolean> {
      return new Promise(resolve => {
         // Create the socket
         this.socket = this.createSocket();
         this.socket.connect();

         // If connection was successful, return true
         this.socket.on("connect", () => {
            resolve(true);
         });
         // If couldn't connect to server, return false
         this.socket.on("connect_error", () => {
            resolve(false);
         });

         let gameDataRequestResolve: (value: GameData | PromiseLike<GameData>) => void;
         this.gameDataResponse = new Promise(resolve => {
            gameDataRequestResolve = resolve;
         });
         this.socket.on("initialGameData", (gameTicks: number, serverTileDataArray: ReadonlyArray<ReadonlyArray<ServerTileData>>, playerID: number) => {
            const tiles = parseServerTileDataArray(serverTileDataArray);

            const serverResponse: GameData = {
               gameTicks: gameTicks,
               tiles: tiles,
               playerID: playerID
            };
            gameDataRequestResolve!(serverResponse);
         })
         
         this.socket.on("gameDataPacket", gameDataPacket => {
            // Only unload game packets when the game is running
            if (Game.getIsPaused() || !Game.isRunning) return;

            this.unloadGameDataPacket(gameDataPacket);

            if (!Game.isSynced) {
               Game.sync();
            }
         });

         this.socket.on("disconnect", () => {
            this.handleServerDisconnect();
         });
      });
   }

   public static async receiveGameData(): Promise<GameData> {
      if (this.socket === null) throw new Error("Socket hadn't been created when requesting game data")

      const serverResponse = await this.gameDataResponse;
      return serverResponse;
   }

   /** Disconnects from the server */
   public static disconnect(): void {
      Game.isRunning = false;

      if (this.socket !== null) {
         this.socket.disconnect();
      }
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
      this.updateEntities(gameDataPacket.serverEntityDataArray);
      this.updateItems(gameDataPacket.serverItemDataArray);
      this.registerTileUpdates(gameDataPacket.tileUpdates);
      this.addNewAttacks(gameDataPacket.serverAttackDataArray);
   }

   /**
    * Updates the client's entities to match those in the server
    */
   private static updateEntities(entityDataArray: ReadonlyArray<ServerEntityData>): void {
      const clientKnownEntityIDs: Array<number> = Object.keys(Board.entities).map(idString => Number(idString));

      // Remove the player from the list of known entities so the player isn't removed
      clientKnownEntityIDs.splice(clientKnownEntityIDs.indexOf(Player.instance.id), 1);

      // Update the game entities
      for (const entityData of entityDataArray) {
         // If it already exists, update it
         if (Board.entities.hasOwnProperty(entityData.id)) {
            Board.entities[entityData.id].updateFromData(entityData);
         } else {
            this.createEntityFromData(entityData);
         }

         clientKnownEntityIDs.splice(clientKnownEntityIDs.indexOf(entityData.id), 1);
      }

      // All remaining known entities must then have been removed
      for (const id of clientKnownEntityIDs) {
         Board.removeEntity(Board.entities[id]);
      }
   }

   private static updateItems(serverItemDataArray: ReadonlyArray<ServerItemData>): void {
      const knownItemIDs = Object.keys(Board.items).map(stringID => Number(stringID));

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
         Board.items[itemID].remove();
      }
   }

   private static createItemFromServerItemData(serverItemData: ServerItemData): void {
      const position = Point.unpackage(serverItemData.position); 
      const containingChunks = serverItemData.chunkCoordinates.map(([x, y]) => Board.getChunk(x, y));
      new Item(serverItemData.id, position, containingChunks, serverItemData.itemID, serverItemData.count, serverItemData.rotation);
   }

   private static updateItemFromServerItemData(serverItemData: ServerItemData): void {
      const item = Board.items[serverItemData.id];
      item.count = serverItemData.count;
   }

   private static registerTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const tileUpdate of tileUpdates) {
         const tile = Board.getTile(tileUpdate.x, tileUpdate.y);
         tile.type = tileUpdate.type;
         tile.isWall = tileUpdate.isWall;
      }
   }

   private static addNewAttacks(serverAttackDataArray: ReadonlyArray<ServerAttackData>): void {
      const attackInfoArray = parseServerAttackDataArray(serverAttackDataArray);
      Game.loadAttackDataArray(attackInfoArray);
   }

   public static createEntityFromData(entityData: ServerEntityData): void {
      const position = Point.unpackage(entityData.position);
      const velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      const acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null;

      // Create the entity
      const entityClass = ENTITY_CLASS_RECORD[entityData.type]();
      new entityClass(entityData.id, position, velocity, acceleration, entityData.terminalVelocity, entityData.rotation, ...entityData.clientArgs);
   }

   /**
    * Sends a message to all players in the server.
    * @param message The message to send to the other players
    */
   public static sendChatMessage(message: string): void {
      // Send the chat message to the server
      if (this.socket !== null) {
         this.socket.emit("chatMessage", message);
      }
   }

   public static sendInitialPlayerData(initialPlayerDataPacket: InitialPlayerDataPacket): void {
      // Send player data to the server
      if (this.socket !== null) {
         this.socket.emit("initialPlayerDataPacket", initialPlayerDataPacket);
      }
   }

   public static sendPlayerDataPacket(): void {
      if (this.socket !== null) {
         const packet: PlayerDataPacket = {
            position: Player.instance.position.package(),
            velocity: Player.instance.velocity?.package() || null,
            acceleration: Player.instance.acceleration?.package() || null,
            terminalVelocity: Player.instance.terminalVelocity,
            rotation: Player.instance.rotation,
            visibleChunkBounds: Camera.getVisibleChunkBounds()
         };

         this.socket.emit("playerDataPacket", packet);
      }
   }

   public static sendAttackPacket(attackPacket: AttackPacket): void {
      if (this.socket !== null) {
         this.socket.emit("attackPacket", attackPacket);
      }
   }

   private static handleServerDisconnect(): void {
      setLoadingScreenInitialStatus("server_disconnect");
      setGameState("loading");
   }
}

export default Client;