import { io, Socket } from "socket.io-client";
import { PlayerData, ClientToServerEvents, ServerToClientEvents, SocketData } from "webgl-test-shared/lib/client-server-types";
import SETTINGS from "webgl-test-shared/lib/settings";
import Tile from "webgl-test-shared/lib/Tile";
import Board from "../Board";
import { addChatMessage } from "../components/ChatBox";
import Player from "../entities/Player";
import { addPlayerToObject, getPlayer } from "../players";
import { Point } from "../utils";

interface ServerResponse {
   tiles: Array<Array<Tile>>;
}

const SERVER_IP_ADDRESS = "10.61.29.81";

abstract class Client {
   private static socket: Socket<ServerToClientEvents, ClientToServerEvents>;

   public static connectToServer(): Promise<ServerResponse | null> {
      return new Promise(resolve => {
         this.socket = io("ws://" + SERVER_IP_ADDRESS + ":" + SETTINGS.SERVER_PORT, { transports: ["websocket", "polling", "flashsocket"] });
         
         const serverResponse: Partial<ServerResponse> = {};
         
         this.socket.on("message", (...args) => {
            for (const message of args) {
               console.log(message);
            }
         });

         // Receive chat messages
         this.socket.on("chatMessage", (senderName, message) => {
            addChatMessage(senderName, message);
         });

         // Add new players
         this.socket.on("newPlayer", (playerData: SocketData) => {
            const position = new Point(playerData.position[0], playerData.position[1]);
            const player = new Player(position, playerData.name, false);
            Board.addEntity(player);

            addPlayerToObject(playerData.clientID, player);
         });

         // Receive movement packets
         this.socket.on("playerMovement", (clientID: string, movementHash: number) => {
            const player = getPlayer(clientID)!;
            player.receiveMovementHash(movementHash);
         });
         
         // Receive the tiles from the server
         this.socket.on("terrain", (tiles: Array<Array<Tile>>) => {
            serverResponse.tiles = tiles;
            resolve(serverResponse as ServerResponse);
         });
         
         // Check if there was an error when connecting to the server
         this.socket.on("connect_error", () => {
            resolve(null);
         });
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

   public static sendPlayerData(data: PlayerData): void {
      // Send the player data to the server
      this.socket.emit("playerData", data);
   }

   public static sendMovementPacket(movementHash: number): void {
      // Send the movement packet to the server
      this.socket.emit("playerMovement", movementHash);
   }
}

export default Client;