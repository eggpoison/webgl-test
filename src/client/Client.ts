import { io, Socket } from "socket.io-client";
import { AttackPacket, ClientToServerEvents, GameDataPacket, PlayerDataPacket, Point, ServerEntityData, ServerItemEntityData, ServerToClientEvents, SETTINGS, ServerTileUpdateData, Vector, ServerTileData, TileInfo, HitboxType, InitialGameDataPacket, ServerInventoryData, ServerItemData, CraftingRecipe, PlayerInventoryType, PlaceablePlayerInventoryType, GameDataSyncPacket } from "webgl-test-shared";
import Camera from "../Camera";
import { setGameState, setLoadingScreenInitialStatus } from "../components/App";
import Player, { Inventory } from "../entities/Player";
import ENTITY_CLASS_RECORD, { EntityClassType } from "../entity-class-record";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Hitbox from "../hitboxes/Hitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import ItemEntity from "../ItemEntity";
import { Tile } from "../Tile";
import { windowHeight, windowWidth } from "../webgl";
import { createItem } from "../items/item-creation";

type ISocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type GameData = {
   readonly gameTicks: number;
   readonly tiles: Array<Array<Tile>>;
   readonly playerID: number;
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
            console.log("badness");
            resolve(false);
         });
         
         if (!socketAlreadyExists) {
            this.socket.on("game_data_packet", gameDataPacket => {
               // Only unload game packets when the game is running
               if (Game.getIsPaused() || !Game.isRunning || !Game.isSynced) return;
   
               this.unloadGameDataPacket(gameDataPacket);
            });

            this.socket.on("game_data_sync_packet", (gameDataSyncPacket: GameDataSyncPacket) => {
               this.registerGameDataSyncPacket(gameDataSyncPacket);
            });
   
            // When the connection to the server fails
            this.socket.on("disconnect", (a) => {
               console.log("very bad cringe");
               console.log(a);
               Game.isRunning = false;
   
               setLoadingScreenInitialStatus("connection_error");
               setGameState("loading");
            });
         }
      });
   }

   public static async requestInitialGameData(): Promise<InitialGameDataPacket> {
      return new Promise(resolve => {
         if (this.socket === null) throw new Error("Socket hadn't been created when requesting game data")

         this.socket.emit("initial_game_data_request");
         console.log("initial_game_data_request");
         
         this.socket.off("initial_game_data_packet");
         this.socket.on("initial_game_data_packet", (initialGameDataPacket: InitialGameDataPacket) => {
            resolve(initialGameDataPacket);
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

   /** Parses the server tile data array into an array of client tiles */
   public static parseServerTileDataArray(serverTileDataArray: ReadonlyArray<ReadonlyArray<ServerTileData>>): Array<Array<Tile>> {
      const tiles = new Array<Array<Tile>>();
   
      for (let y = 0; y < SETTINGS.BOARD_DIMENSIONS; y++) {
         tiles[y] = new Array<Tile>();
         for (let x = 0; x < SETTINGS.BOARD_DIMENSIONS; x++) {
            const serverTileData = serverTileDataArray[y][x];
            const tileInfo: TileInfo = {
               type: serverTileData.type,
               biomeName: serverTileData.biomeName,
               isWall: serverTileData.isWall
            }
            tiles[y][x] = new Tile(serverTileData.x, serverTileData.y, tileInfo);
         }
      }
   
      return tiles;
   }

   public static unloadGameDataPacket(gameDataPacket: GameDataPacket): void {
      Game.setTicks(gameDataPacket.serverTicks);
      
      this.updateEntities(gameDataPacket.serverEntityDataArray);
      this.updateItemEntities(gameDataPacket.serverItemEntityDataArray);
      this.updatePlayerHotbar(gameDataPacket.playerHotbarInventory);
      this.updateCraftingOutputItem(gameDataPacket.craftingOutputItem);
      this.updateHeldItem(gameDataPacket.playerHeldItem);
      this.registerTileUpdates(gameDataPacket.tileUpdates);

      // Register hits
      for (const hitData of gameDataPacket.hitsTaken) {
         Player.registerHit(hitData);
      }

      Player.setHealth(gameDataPacket.playerHealth);
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

   private static updateItemEntities(serverItemEntityDataArray: ReadonlyArray<ServerItemEntityData>): void {
      const knownItemEntityIDs = Object.keys(Game.board.items).map(stringID => Number(stringID));

      for (const serverItemData of serverItemEntityDataArray) {
         if (!knownItemEntityIDs.includes(serverItemData.id)) {
            // New item
            this.createItemFromServerItemData(serverItemData);
         }

         knownItemEntityIDs.splice(knownItemEntityIDs.indexOf(serverItemData.id), 1);
      }

      // Thus the remaining known item IDs have had their items removed
      for (const itemID of knownItemEntityIDs) {
         Game.board.items[itemID].remove();
      }
   }

   private static createItemFromServerItemData(serverItemEntityData: ServerItemEntityData): void {
      const position = Point.unpackage(serverItemEntityData.position); 
      const containingChunks = serverItemEntityData.chunkCoordinates.map(([x, y]) => Game.board.getChunk(x, y));
      new ItemEntity(serverItemEntityData.id, position, containingChunks, serverItemEntityData.itemID, serverItemEntityData.rotation);
   }

   private static updatePlayerHotbar(serverHotbarInventoryData: ServerInventoryData): void {
      const inventory: Inventory = {};
      for (const [itemSlot, serverItemData] of Object.entries(serverHotbarInventoryData) as unknown as ReadonlyArray<[number, ServerItemData]>) {
         const item = createItem(serverItemData.type, serverItemData.count);
         inventory[itemSlot] = item;
      }
      Player.setHotbarInventory(inventory);
   }

   private static updateCraftingOutputItem(serverCraftingOutputItemData: ServerItemData | null): void {
      if (serverCraftingOutputItemData === null) {
         Player.setCraftingOutputItem(null);
      } else {
         const craftingOutputItem = createItem(serverCraftingOutputItemData.type, serverCraftingOutputItemData.count);
         Player.setCraftingOutputItem(craftingOutputItem);
      }
   }

   private static updateHeldItem(serverHeldItemData: ServerItemData | null): void {
      if (serverHeldItemData === null) {
         Player.setHeldItem(null);
      } else {
         const heldItem = createItem(serverHeldItemData.type, serverHeldItemData.count);
         Player.setHeldItem(heldItem);
      }
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

      // Create the hitboxes
      const hitboxes = new Set<Hitbox<HitboxType>>();
      for (const hitboxData of entityData.hitboxes) {
         switch (hitboxData.type) {
            case "circular": {
               hitboxes.add(new CircularHitbox(hitboxData));
               break;
            }
            case "rectangular": {
               hitboxes.add(new RectangularHitbox(hitboxData));
               break;
            }
         }
      }

      // Create the entity
      const entityConstructor = ENTITY_CLASS_RECORD[entityData.type]() as EntityClassType<typeof entityData.type>;
      const entity = new entityConstructor(position, hitboxes, entityData.id, entityData.secondsSinceLastHit, ...entityData.clientArgs);
      
      entity.velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      entity.acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null
      entity.rotation = entityData.rotation;
      entity.special = entityData.special;
   }

   private static registerGameDataSyncPacket(gameDataSyncPacket: GameDataSyncPacket): void {
      if (!Game.isRunning || Player.instance === null) return;

      Player.instance.position = Point.unpackage(gameDataSyncPacket.position);
      Player.instance.velocity = gameDataSyncPacket.velocity !== null ? Vector.unpackage(gameDataSyncPacket.velocity) : null;
      Player.instance.acceleration = gameDataSyncPacket.acceleration !== null ? Vector.unpackage(gameDataSyncPacket.acceleration) : null;
      Player.instance.rotation = gameDataSyncPacket.rotation;
      Player.instance.terminalVelocity = gameDataSyncPacket.terminalVelocity;
      Player.setHealth(gameDataSyncPacket.health);
      this.updatePlayerHotbar(gameDataSyncPacket.playerHotbarInventory);

      Game.sync();
   }

   /**
    * Sends a message to all players in the server.
    * @param message The message to send to the other players
    */
   public static sendChatMessage(message: string): void {
      // Send the chat message to the server
      if (this.socket !== null) {
         this.socket.emit("chat_message", message);
         console.log("chat_message");
      }
   }

   public static sendInitialPlayerData(username: string): void {
      // Send player data to the server
      if (this.socket !== null) {
         this.socket.emit("initial_player_data", username, windowWidth, windowHeight);
         console.log("initial_player_data");
      }
   }

   public static sendPlayerDataPacket(): void {
      if (Game.isRunning && this.socket !== null && Player.instance !== null) {
         const packet: PlayerDataPacket = {
            position: Player.instance.position.package(),
            velocity: Player.instance.velocity?.package() || null,
            acceleration: Player.instance.acceleration?.package() || null,
            terminalVelocity: Player.instance.terminalVelocity,
            rotation: Player.instance.rotation,
            visibleChunkBounds: Camera.getVisibleChunkBounds()
         };

         this.socket.emit("player_data_packet", packet);
         // console.log("player_data_packet");
         console.log(packet);
      }
   }

   public static sendCraftingPacket(craftingRecipe: CraftingRecipe): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("crafting_packet", craftingRecipe);
         console.log("crafting_packet");
      }
   }

   public static sendItemHoldPacket(inventory: PlayerInventoryType, itemSlot: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_hold_packet", inventory, itemSlot);
         console.log("item_hold_packet");
      }
   }

   public static sendItemReleasePacket(inventory: PlaceablePlayerInventoryType, itemSlot: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_release_packet", inventory, itemSlot);
         console.log("item_release_packet");
      }
   }

   public static sendAttackPacket(attackPacket: AttackPacket): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("attack_packet", attackPacket);
         console.log("attack_packet");
      }
   }

   public static sendItemUsePacket(itemSlot: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_use_packet", itemSlot);
         console.log("item_use_packet");
      }
   }

   public static sendDeactivatePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("deactivate");
         console.log("deactivate");
      }
   }

   public static sendActivatePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("activate");
         console.log("activate");
      }
   }
}

export default Client;