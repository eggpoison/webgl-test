import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents, SocketData } from "webgl-test-shared/lib/client-server-types";
import SETTINGS from "webgl-test-shared/lib/settings";
import Tile from "webgl-test-shared/lib/Tile";
import { GameState, setGameState } from "../App";
import Board from "../Board";
import { addChatMessage } from "../components/ChatBox";
import Player from "../entities/Player";
import TransformComponent from "../entity-components/TransformComponent";
import Game from "../Game";
import { addPlayer, getPlayer, removePlayer } from "../players";
import { Point } from "../utils";

interface ServerResponse {
   tiles: Array<Array<Tile>>;
}

const SERVER_IP_ADDRESS = "172.20.92.247";

export type PlayerData = Omit<SocketData, "clientID">;

abstract class Client {
   private static socket: Socket<ServerToClientEvents, ClientToServerEvents>;

   public static connectToServer(): Promise<ServerResponse | null> {
      return new Promise(resolve => {
         this.createSocket();

         this.socket.connect();

         const serverResponse: Partial<ServerResponse> = {};

         // Receive chat messages
         this.socket.on("chatMessage", (senderName, message) => {
            addChatMessage(senderName, message);
         });

         // Add new players
         this.socket.on("newPlayer", (playerData: SocketData) => {
            const position = new Point(playerData.position[0], playerData.position[1]);
            const player = new Player(position, playerData.name, false);
            Board.addEntity(player);

            addPlayer(playerData.clientID, player);
         });

         // Receive movement packets
         this.socket.on("playerMovement", (clientID: string, movementHash: number) => {
            const player = getPlayer(clientID)!;
            player.receiveMovementHash(movementHash);
         });

         // Forward position
         this.socket.on("position", () => {
            const playerPosition = Player.instance.getComponent(TransformComponent)!.position;

            const positionData: [number, number] = [playerPosition.x, playerPosition.y];
            this.socket.emit("position", positionData);
         });
         
         // Receive the tiles from the server
         this.socket.on("terrain", (tiles: Array<Array<Tile>>) => {
            serverResponse.tiles = tiles;
            resolve(serverResponse as ServerResponse);
         });

         this.socket.on("clientDisconnect", (clientID: string) => {
            removePlayer(clientID);
         });
         
         // Check if there was an error when connecting to the server
         this.socket.on("connect_error", () => {
            if (Game.isRunning) {
               setGameState(GameState.serverError);
            } else {
               resolve(null);
               this.socket.connect();
            }
         });
      });
   }

   public static attemptReconnect(): void {
      Client.createSocket();
      Client.socket.connect();
   }

   private static createSocket(): void {
      const url = "ws://" + SERVER_IP_ADDRESS + ":" + SETTINGS.SERVER_PORT;
      this.socket = io(url, {
         transports: ["websocket", "polling", "flashsocket"],
         autoConnect: false
      });
   }

   /**
    * Sends a message to all players in the server.
    * @param message The message to send to the other players
    */
   public static sendChatMessage(message: string): void {
      // Send the chat message to the server
      this.socket.emit("chatMessage", message);
   }

   public static sendPlayerData(playerData: PlayerData): void {
      const socketData: SocketData = Object.assign(playerData, { clientID: this.socket.id });

      // Send the player data to the server
      this.socket.emit("socketData", socketData);
   }

   public static sendMovementPacket(movementHash: number): void {
      // Send the movement packet to the server
      this.socket.emit("playerMovement", movementHash);
   }
}

export default Client;