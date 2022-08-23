import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, GameDataPacket, ServerToClientEvents, SETTINGS, Tile } from "webgl-test-shared";
import { GameState, setGameState } from "../App";
import Camera from "../Camera";
import Player from "../entities/Player";
import Game from "../Game";

// const spawnMobs = (positions: Array<[number, number]>, entityID: number): void => {

// }

type ServerResponse = {
   readonly gameTicks: number;
   readonly tiles: Array<Array<Tile>>;
}

abstract class Client {
   private static socket: Socket<ServerToClientEvents, ClientToServerEvents>;

   public static connectToServer(): Promise<ServerResponse | null> {
      return new Promise(resolve => {
         // Create the socket
         this.createSocket();
         this.socket.connect();

         // Wait for the server data
         this.socket.on("initialGameData", (gameTicks: number, tiles: Array<Array<Tile>>) => {
            const serverResponse: ServerResponse = {
               gameTicks: gameTicks,
               tiles: tiles
            };
            resolve(serverResponse);
         });

         this.socket.on("gameDataPacket", (gameDataPacket: GameDataPacket) => {
            console.log(gameDataPacket);
         });

         // // Receive chat messages
         // this.socket.on("chatMessage", (senderName, message) => {
         //    addChatMessage(senderName, message);
         // });

         // // Add new players
         // this.socket.on("newPlayer", (playerData: SocketData) => {
         //    console.log("new player: " + playerData.clientID);
         //    const position = new Point(playerData.position[0], playerData.position[1]);
         //    const player = new Player(position, playerData.name, false);
         //    Board.addEntity(player);

         //    addPlayer(playerData.clientID, player);
         // });

         // // Receive movement packets
         // this.socket.on("playerMovement", (clientID: string, movementHash: number) => {
         //    const player = getPlayer(clientID)!;
         //    player.receiveMovementHash(movementHash);
         // });

         // // Forward position
         // this.socket.on("position", () => {
         //    const playerPosition = Player.instance.getComponent(TransformComponent)!.position;

         //    const positionData: [number, number] = [playerPosition.x, playerPosition.y];
         //    this.socket.emit("position", positionData);
         // });
         
         // // Receive the tiles from the server
         // this.socket.on("terrain", (tiles: Array<Array<Tile>>) => {
         //    serverResponse.tiles = tiles;

         //    resolve(serverResponse as ServerResponse);
         // });

         // this.socket.on("clientDisconnect", (clientID: string) => {
         //    removePlayer(clientID);
         // });

         // this.socket.on("entityPacket", (packet: EntityPacket) => {
         //    spawnMobs(packet.positions, packet.entityID);
         // });
         
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

   /** Creates the socket used to connect to the server */
   private static createSocket(): void {
      this.socket = io(`ws://localhost:${SETTINGS.SERVER_PORT}`, {
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

   public static sendPlayerData(name: string, position: [number, number]): void {
      const visibleChunkBounds = Camera.calculateVisibleChunkBounds();

      // Send the player data to the server
      this.socket.emit("initialPlayerData", name, position, visibleChunkBounds);
   }

   public static sendMovementPacket(movementHash: number): void {
      const playerPosition = Player.instance.position;
      const positionData: [number, number] = [playerPosition.x, playerPosition.y];
      
      // Send the movement packet to the server
      this.socket.emit("playerMovement", positionData, movementHash);
   }
}

export default Client;