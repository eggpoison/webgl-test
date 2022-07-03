import SETTINGS from "./settings";
import { io } from "socket.io-client";
import { generateTerrain } from "./terrain-generation";
import Tile from "./Tile";

interface ServerResponse {
   tiles: Array<Array<Tile>>;
}

export function connectToServer(): Promise<ServerResponse | null> {
   return new Promise(resolve => {
      const socket = io("ws://" + SETTINGS.serverIPAddress + ":" + SETTINGS.serverPort, { transports: ["websocket", "polling", "flashsocket"] });
      
      const serverResponse: Partial<ServerResponse> = {};
      
      // Generate the terrain
      socket.on("terrain_generation_request", () => {
         const terrain = generateTerrain();
         console.log("Sending terrain");
         
         socket.emit("terrain", terrain);
      });
      
      socket.on("message", (...args) => {
         for (const message of args) {
            console.log(message);
         }
      });
      
      // Receive the terrain
      socket.on("terrain", (tiles: Array<Array<Tile>>) => {
         console.log("Received tiles from server:", tiles);

         serverResponse.tiles = tiles;
         resolve(serverResponse as ServerResponse);
      });
      
      socket.on("connect_error", () => {
         resolve(null);
      });
   });
}