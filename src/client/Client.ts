import { io, Socket } from "socket.io-client";
import { AttackPacket, ClientToServerEvents, GameDataPacket, PlayerDataPacket, Point, EntityData, ItemEntityData, ServerToClientEvents, SETTINGS, ServerTileUpdateData, Vector, ServerTileData, TileInfo, HitboxType, InitialGameDataPacket, CraftingRecipe, PlayerInventoryType, PlaceablePlayerInventoryType, GameDataSyncPacket, RespawnDataPacket, PlayerInventoryData, ItemData } from "webgl-test-shared";
import { setGameState, setLoadingScreenInitialStatus } from "../components/App";
import Player from "../entities/Player";
import ENTITY_CLASS_RECORD, { EntityClassType } from "../entity-class-record";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Hitbox from "../hitboxes/Hitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import ItemEntity from "../items/ItemEntity";
import { Tile } from "../Tile";
import { createItem } from "../items/item-creation";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import Chunk from "../Chunk";
import { ItemSlots } from "../items/Item";
import { updateInventoryIsOpen } from "../player-input";
import { Hotbar_updateBackpackItemSlot, Hotbar_updateHotbarInventory } from "../components/game/Hotbar";
import { BackpackInventoryMenu_setBackpackItemSlots } from "../components/game/menus/BackpackInventory";
import { setHeldItemVisual } from "../components/game/HeldItem";
import { CraftingMenu_setCraftingMenuOutputItem } from "../components/game/menus/CraftingMenu";

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
            resolve(false);
         });
         
         if (!socketAlreadyExists) {
            this.socket.on("game_data_packet", gameDataPacket => {
               // Only unload game packets when the game is running
               if (Game.getIsPaused() || !Game.isRunning || !Game.isSynced) return;
   
               this.unloadGameDataPacket(gameDataPacket);
            });
   
            // When the connection to the server fails
            this.socket.on("disconnect", disconnectReason => {
               // Don't show a connection error if the socket was disconnected manually
               if (disconnectReason === "io client disconnect") return;

               Game.isRunning = false;
               
               setLoadingScreenInitialStatus("connection_error");
               setGameState("loading");

               Player.instance = null;
            });

            this.socket.on("game_data_sync_packet", (gameDataSyncPacket: GameDataSyncPacket) => {
               this.registerGameDataSyncPacket(gameDataSyncPacket);
            });

            this.socket.on("respawn_data_packet", (respawnDataPacket: RespawnDataPacket): void => {
               this.respawnPlayer(respawnDataPacket);
            });
         }
      });
   }

   public static async requestInitialGameData(): Promise<InitialGameDataPacket> {
      return new Promise(resolve => {
         if (this.socket === null) throw new Error("Socket hadn't been created when requesting game data")

         this.socket.emit("initial_game_data_request");
         
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

   public static disconnect(): void {
      if (this.socket === null) {
         throw new Error("Tried to disconnect a socket which doesn't exist");
      }

      this.socket.disconnect();
      this.socket = null;
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
      
      this.updateEntities(gameDataPacket.entityDataArray);
      this.updateItemEntities(gameDataPacket.itemEntityDataArray);
      this.updatePlayerInventory(gameDataPacket.inventory);
      this.registerTileUpdates(gameDataPacket.tileUpdates);

      // Register hits
      for (const hitData of gameDataPacket.hitsTaken) {
         Player.registerHit(hitData);
      }

      if (Player.instance !== null) {
         if (gameDataPacket.hitsTaken.length >= 1) {
            Player.instance.secondsSinceLastHit = 0;
         }
      }

      Game.definiteGameState.setPlayerHealth(gameDataPacket.playerHealth);
      if (Game.definiteGameState.playerIsDead()) {
         gameScreenSetIsDead(true);
      
         // If the player's inventory is open, close it
         updateInventoryIsOpen(false);
      }
   }

   /**
    * Updates the client's entities to match those in the server
    */
   private static updateEntities(entityDataArray: ReadonlyArray<EntityData>): void {
      const clientKnownEntityIDs: Array<number> = Object.keys(Game.board.entities).map(idString => Number(idString));

      // Remove the player from the list of known entities so the player isn't removed
      if (Player.instance !== null) {
         clientKnownEntityIDs.splice(clientKnownEntityIDs.indexOf(Player.instance.id), 1);
      }

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

   private static updateItemEntities(serverItemEntityDataArray: ReadonlyArray<ItemEntityData>): void {
      const knownItemEntityIDs = Object.keys(Game.board.itemEntities).map(stringID => Number(stringID));

      for (const serverItemData of serverItemEntityDataArray) {
         if (!knownItemEntityIDs.includes(serverItemData.id)) {
            // New item
            this.createItemFromServerItemData(serverItemData);
         } else {
            // Otherwise update it
            if (Game.board.itemEntities.hasOwnProperty(serverItemData.id)) {
               const itemEntity = Game.board.itemEntities[serverItemData.id];
               itemEntity.updateFromData(serverItemData);
            }
            
         }

         knownItemEntityIDs.splice(knownItemEntityIDs.indexOf(serverItemData.id), 1);
      }

      // Thus the remaining known item IDs have had their items removed
      for (const itemID of knownItemEntityIDs) {
         Game.board.itemEntities[itemID].remove();
      }
   }

   private static updatePlayerInventory(playerInventoryData: PlayerInventoryData) {
      // Hotbar
      const hotbarItemSlots: ItemSlots = {};
      for (const [itemSlot, item] of Object.entries(playerInventoryData.hotbar) as unknown as ReadonlyArray<[number, ItemData]>) {
         hotbarItemSlots[itemSlot] = createItem(item.type, item.count);
      }
      Game.definiteGameState.hotbarItemSlots = hotbarItemSlots;
      if (typeof Hotbar_updateHotbarInventory !== "undefined") {
         Hotbar_updateHotbarInventory(Object.assign({}, hotbarItemSlots));
      }

      // Backpack inventory
      const backpackItemSlots: ItemSlots = {};
      for (const [itemSlot, item] of Object.entries(playerInventoryData.backpackInventory) as unknown as ReadonlyArray<[number, ItemData]>) {
         backpackItemSlots[itemSlot] = createItem(item.type, item.count);
      }
      Game.definiteGameState.backpackItemSlots = backpackItemSlots;
      if (typeof BackpackInventoryMenu_setBackpackItemSlots !== "undefined") {
         BackpackInventoryMenu_setBackpackItemSlots(Object.assign({}, backpackItemSlots));
      }

      // Crafting output item
      if (playerInventoryData.craftingOutputItemSlot !== null) {
         const craftingOutputItem = createItem(playerInventoryData.craftingOutputItemSlot.type, playerInventoryData.craftingOutputItemSlot.count);
         Game.definiteGameState.craftingOutputItemSlot = craftingOutputItem;
      } else {
         Game.definiteGameState.craftingOutputItemSlot = null;
      }
      if (typeof CraftingMenu_setCraftingMenuOutputItem !== "undefined") {
         CraftingMenu_setCraftingMenuOutputItem(Game.definiteGameState.craftingOutputItemSlot);
      }

      // Backpack slot
      if (playerInventoryData.backpackItemSlot !== null) {
         const craftingOutputItem = createItem(playerInventoryData.backpackItemSlot.type, playerInventoryData.backpackItemSlot.count);

         Game.definiteGameState.backpackItemSlot = craftingOutputItem;
         Hotbar_updateBackpackItemSlot(Object.assign({}, Game.definiteGameState.backpackItemSlot));
      } else {
         Game.definiteGameState.backpackItemSlot = null;
         Hotbar_updateBackpackItemSlot(null);
      }

      // Held item
      if (playerInventoryData.heldItemSlot === null) {
         Game.definiteGameState.heldItemSlot = null;
      } else {
         const heldItem = createItem(playerInventoryData.heldItemSlot.type, playerInventoryData.heldItemSlot.count);
         Game.definiteGameState.heldItemSlot = heldItem;
      }
      setHeldItemVisual(Game.definiteGameState.heldItemSlot);
   }

   private static createItemFromServerItemData(serverItemEntityData: ItemEntityData): void {
      const position = Point.unpackage(serverItemEntityData.position); 
      const velocity = serverItemEntityData.velocity !== null ? Vector.unpackage(serverItemEntityData.velocity) : null;

      const containingChunks = new Set<Chunk>();
      for (const [chunkX, chunkY] of serverItemEntityData.chunkCoordinates) {
         const chunk = Game.board.getChunk(chunkX, chunkY);
         containingChunks.add(chunk);
      }

      new ItemEntity(serverItemEntityData.id, position, velocity, containingChunks, serverItemEntityData.itemID, serverItemEntityData.rotation);
   }
   
   private static registerTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const tileUpdate of tileUpdates) {
         const tile = Game.board.getTile(tileUpdate.x, tileUpdate.y);
         tile.type = tileUpdate.type;
         tile.isWall = tileUpdate.isWall;
      }
   }

   public static createEntityFromData(entityData: EntityData): void {
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
      if (!Game.isRunning) return;

      if (Player.instance !== null) {
         Player.instance.position = Point.unpackage(gameDataSyncPacket.position);
         Player.instance.velocity = gameDataSyncPacket.velocity !== null ? Vector.unpackage(gameDataSyncPacket.velocity) : null;
         Player.instance.acceleration = gameDataSyncPacket.acceleration !== null ? Vector.unpackage(gameDataSyncPacket.acceleration) : null;
         Player.instance.rotation = gameDataSyncPacket.rotation;
         Player.instance.terminalVelocity = gameDataSyncPacket.terminalVelocity;
         Game.definiteGameState.setPlayerHealth(gameDataSyncPacket.health);
         this.updatePlayerInventory(gameDataSyncPacket.inventory);

         if (Game.definiteGameState.playerIsDead()) {
            gameScreenSetIsDead(true);
            
            // If the player's inventory is open, close it
            updateInventoryIsOpen(false);
         }
      }

      Game.sync();
   }

   private static respawnPlayer(respawnDataPacket: RespawnDataPacket): void {
      Game.definiteGameState.setPlayerHealth(Player.MAX_HEALTH);
      
      const spawnPosition = Point.unpackage(respawnDataPacket.spawnPosition);
      new Player(spawnPosition, new Set(Player.HITBOXES), respawnDataPacket.playerID, null, Game.definiteGameState.playerUsername);

      gameScreenSetIsDead(false);
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

   public static sendInitialPlayerData(username: string): void {
      // Send player data to the server
      if (this.socket !== null) {
         this.socket.emit("initial_player_data", username);
      }
   }

   public static sendPlayerDataPacket(): void {
      if (Game.isRunning && this.socket !== null && Player.instance !== null) {
         const packet: PlayerDataPacket = {
            position: Player.instance.position.package(),
            velocity: Player.instance.velocity?.package() || null,
            acceleration: Player.instance.acceleration?.package() || null,
            terminalVelocity: Player.instance.terminalVelocity,
            rotation: Player.instance.rotation
         };

         this.socket.emit("player_data_packet", packet);
      }
   }

   public static sendCraftingPacket(craftingRecipe: CraftingRecipe): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("crafting_packet", craftingRecipe);
      }
   }

   public static sendItemPickupPacket(inventory: PlayerInventoryType, itemSlot: number, amount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_pickup_packet", inventory, itemSlot, amount);
      }
   }

   public static sendItemReleasePacket(inventory: PlaceablePlayerInventoryType, itemSlot: number, amount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_release_packet", inventory, itemSlot, amount);
      }
   }

   public static sendAttackPacket(attackPacket: AttackPacket): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("attack_packet", attackPacket);
      }
   }

   public static sendItemUsePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         const itemSlot = Game.latencyGameState.selectedHotbarItemSlot;
         this.socket.emit("item_use_packet", itemSlot);
      }
   }

   public static sendThrowHeldItemPacket(throwDirection: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("throw_held_item_packet", throwDirection);
      }
   }

   public static sendDeactivatePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("deactivate");
      }
   }

   public static sendActivatePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("activate");
      }
   }

   public static sendRespawnRequest(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("respawn");
      }
   }
}

export default Client;