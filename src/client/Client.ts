import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, EntityData, EntityType, GameDataPacket, PlayerDataPacket, Point, ServerToClientEvents, SETTINGS, Tile, Vector, VisibleChunkBounds } from "webgl-test-shared";
import { connect } from "..";
import { GameState, setGameMessage, setGameState } from "../components/App";
import Board from "../Board";
import Camera from "../Camera";
import Player from "../entities/Player";
import ENTITY_CLASS_RECORD from "../entity-class-record";
import Game from "../Game";

type ISocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type ServerResponse = {
   readonly gameTicks: number;
   readonly tiles: Array<Array<Tile>>;
   readonly playerID: number;
}

abstract class Client {
   private static socket: ISocket | null = null;

   public static connectToServer(): Promise<ServerResponse | null> {
      return new Promise(resolve => {
         setGameMessage("Connecting to server...");

         // Create the socket
         this.socket = this.createSocket();
         this.socket.connect();

         setGameMessage("Waiting for game data...");

         // Wait for the server data
         this.socket.on("initialGameData", (gameTicks: number, tiles: Array<Array<Tile>>, playerID: number) => {
            const serverResponse: ServerResponse = {
               gameTicks: gameTicks,
               tiles: tiles,
               playerID: playerID
            };
            resolve(serverResponse);
         });

         this.socket.on("gameDataPacket", (gameDataPacket: GameDataPacket) => {
            // Don't unload game packets when paused
            if (!Game.isPaused) {
               this.unloadGameDataPacket(gameDataPacket);
               
               // Sync the game
               Game.isSynced = true;
            }
         });
         
         // Check if there was an error when connecting to the server
         this.socket.on("connect_error", () => {
            this.disconnect();
            setGameState(GameState.error);
            resolve(null);
         });
      });
   }

   /** Disconnects from the server */
   public static disconnect(): void {
      Game.isRunning = false;

      if (this.socket !== null) {
         this.socket.disconnect();
      }
   }

   public static async attemptReconnect(): Promise<void> {
      connect();
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
      const clientKnownEntityIDs: Array<number> = Object.keys(Board.entities).map(idString => Number(idString));

      // Remove the player from the list of known entities so the player isn't removed
      clientKnownEntityIDs.splice(clientKnownEntityIDs.indexOf(Player.instance.id), 1);

      // Update the game entities
      for (const entityData of gameDataPacket.nearbyEntities) {
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

   public static createEntityFromData(entityData: EntityData<EntityType>): void {
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

   public static sendInitialPlayerData(name: string, position: [number, number]): void {
      // Send player data to the server
      if (this.socket !== null) {
         const visibleChunkBounds = Camera.calculateVisibleChunkBounds();
         this.socket.emit("initialPlayerData", name, position, visibleChunkBounds);
      }
   }

   public static sendPlayerDataPacket(): void {
      const packet: PlayerDataPacket = {
         position: Player.instance.position.package(),
         velocity: Player.instance.velocity?.package() || null,
         acceleration: Player.instance.acceleration?.package() || null,
         terminalVelocity: Player.instance.terminalVelocity,
         rotation: Player.instance.rotation
      };

      this.socket?.emit("playerDataPacket", packet);
   }

   public static sendVisibleChunkBoundsPacket(visibleChunkBounds: VisibleChunkBounds): void {
      if (this.socket !== null) {
         this.socket.emit("newVisibleChunkBounds", visibleChunkBounds);
      }
   }
}

export default Client;