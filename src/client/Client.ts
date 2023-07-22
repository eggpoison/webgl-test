import { io, Socket } from "socket.io-client";
import { AttackPacket, ClientToServerEvents, GameDataPacket, PlayerDataPacket, Point, EntityData, DroppedItemData, ServerToClientEvents, SETTINGS, ServerTileUpdateData, Vector, ServerTileData, TileInfo, HitboxType, InitialGameDataPacket, CraftingRecipe, PlayerInventoryType, PlaceablePlayerInventoryType, GameDataSyncPacket, RespawnDataPacket, PlayerInventoryData, ItemData, InventoryData, ItemSlotData, EntityType, HitboxData, HitboxInfo, ProjectileData } from "webgl-test-shared";
import { setGameState, setLoadingScreenInitialStatus } from "../components/App";
import Player from "../entities/Player";
import ENTITY_CLASS_RECORD, { EntityClassType } from "../entity-class-record";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Hitbox from "../hitboxes/Hitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import DroppedItem from "../items/DroppedItem";
import { Tile } from "../Tile";
import { createItem } from "../items/item-creation";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import Chunk from "../Chunk";
import Item, { ItemSlot, ItemSlots } from "../items/Item";
import { updateInventoryIsOpen } from "../player-input";
import { Hotbar_updateBackpackItemSlot, Hotbar_updateHotbarInventory } from "../components/game/inventories/Hotbar";
import { BackpackInventoryMenu_setBackpackItemSlots } from "../components/game/inventories/BackpackInventory";
import { setHeldItemVisual } from "../components/game/HeldItem";
import { CraftingMenu_setCraftingMenuOutputItem } from "../components/game/menus/CraftingMenu";
import { updateHealthBar } from "../components/game/HealthBar";
import { registerServerTick } from "../components/game/nerd-vision/GameInfoDisplay";
import { updateRenderChunkFromTileBuffer } from "../rendering/tile-rendering/solid-tile-rendering";
import createProjectile from "../projectiles/projectile-creation";
import Camera from "../Camera";

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

               registerServerTick();
   
               this.unloadGameDataPacket(gameDataPacket);
            });
   
            // When the connection to the server fails
            this.socket.on("disconnect", disconnectReason => {
               // Don't show a connection error if the socket was disconnected manually
               if (disconnectReason === "io client disconnect") return;

               console.warn(disconnectReason);

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
      Game.ticks = gameDataPacket.serverTicks;
      Game.time = gameDataPacket.serverTime;

      this.updateEntities(gameDataPacket.entityDataArray);
      this.updateDroppedItems(gameDataPacket.droppedItemDataArray);
      this.updateProjectiles(gameDataPacket.projectileDataArray);
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
   private static updateEntities(entityDataArray: ReadonlyArray<EntityData<EntityType>>): void {
      const knownEntityIDs = new Set(Object.keys(Game.board.entities).map(idString => Number(idString)));
      
      // Remove the player from the list of known entities so the player isn't removed
      if (Player.instance !== null) {
         knownEntityIDs.delete(Player.instance.id);
      }

      // Update the game entities
      for (const entityData of entityDataArray) {
         // If it already exists, update it
         if (Game.board.entities.hasOwnProperty(entityData.id)) {
            Game.board.entities[entityData.id].updateFromData(entityData);
         } else {
            this.createEntityFromData(entityData);
         }

         knownEntityIDs.delete(entityData.id);
      }

      // All known entity ids which haven't been removed are ones which are dead
      for (const id of knownEntityIDs) {
         if (typeof Game.board.entities[id] === "undefined") {
            console.warn("CRINGE #1 DETECTED");
         }
         Game.board.removeGameObject(Game.board.entities[id]);
      }
   }

   private static updateDroppedItems(serverItemEntityDataArray: ReadonlyArray<DroppedItemData>): void {
      const ids = new Set(Object.keys(Game.board.droppedItems).map(idString => Number(idString)));

      for (const serverItemData of serverItemEntityDataArray) {
         if (!ids.has(serverItemData.id)) {
            // New item
            this.createItemFromServerItemData(serverItemData);
         } else {
            // Otherwise update it
            if (Game.board.droppedItems.hasOwnProperty(serverItemData.id)) {
               const itemEntity = Game.board.droppedItems[serverItemData.id];
               itemEntity.updateFromData(serverItemData);
            }
         }

         ids.delete(serverItemData.id);
      }

      // All known entity ids which haven't been removed are ones which are dead
      for (const id of ids) {
         if (typeof Game.board.droppedItems[id] === "undefined") {
            throw new Error("CRINGE2");
         }
         Game.board.removeGameObject(Game.board.droppedItems[id]);
      }
   }

   private static updateProjectiles(projectilesDataArray: ReadonlyArray<ProjectileData>): void {
      const ids = new Set(Object.keys(Game.board.projectiles).map(idString => Number(idString)));

      for (const projectileData of projectilesDataArray) {
         if (!ids.has(projectileData.id)) {
            // New projectile
            this.createProjectileFromServerData(projectileData);
         } else {
            // Otherwise update it
            const projectile = Game.board.projectiles[projectileData.id];
            projectile.updateFromData(projectileData);
         }

         ids.delete(projectileData.id);
      }

      // All known entity ids which haven't been removed are ones which are dead
      for (const id of ids) {
         if (typeof Game.board.projectiles[id] === "undefined") {
            throw new Error("CRINGE3");
         }
         Game.board.removeGameObject(Game.board.projectiles[id]);
      }
   }

   private static updateItemSlotFromServerData(itemSlot: ItemSlot, itemSlotData: ItemSlotData): ItemSlot {
      // If the item is being removed, remove it
      if (itemSlotData === null) {
         return null;
      }
      
      // If there is an item which will replace the existing item, replace it
      if (itemSlot === null || itemSlot.id !== itemSlotData.id) {
         return createItem(itemSlotData.type, itemSlotData.count, itemSlotData.id);
      } else {
         // Otherwise update the existing item
         itemSlot.updateFromServerData(itemSlotData);
         return itemSlot;
      }
   }

   private static updateInventoryFromServerData(itemSlots: ItemSlots, inventoryData: InventoryData): void {
      // Remove any items which have been removed from the inventory
      for (const [itemSlot, item] of Object.entries(itemSlots) as unknown as ReadonlyArray<[number, Item]>) {
         // If it doesn't exist in the server data, remove it
         if (!inventoryData.hasOwnProperty(itemSlot) || inventoryData[itemSlot].id !== item.id) {
            delete itemSlots[itemSlot];
         }
      }

      // Add all new items from the server data
      for (const [itemSlot, itemData] of Object.entries(inventoryData) as unknown as ReadonlyArray<[number, ItemData]>) {
         // If the item doesn't exist in the inventory, add it
         if (!itemSlots.hasOwnProperty(itemSlot) || itemSlots[itemSlot].id !== itemData.id) {
            itemSlots[itemSlot] = createItem(itemData.type, itemData.count, itemData.id);
         } else {
            // Otherwise the item needs to be updated with the new server data
            itemSlots[itemSlot].updateFromServerData(itemData);
         }
      }
   }

   private static updatePlayerInventory(playerInventoryData: PlayerInventoryData) {
      // Hotbar
      this.updateInventoryFromServerData(Game.definiteGameState.hotbarItemSlots, playerInventoryData.hotbar);
      Hotbar_updateHotbarInventory(Game.definiteGameState.hotbarItemSlots);

      // Backpack inventory
      this.updateInventoryFromServerData(Game.definiteGameState.backpackItemSlots, playerInventoryData.backpackInventory);
      BackpackInventoryMenu_setBackpackItemSlots(Object.assign({}, Game.definiteGameState.backpackItemSlots));

      // Crafting output item
      Game.definiteGameState.craftingOutputSlot = this.updateItemSlotFromServerData(Game.definiteGameState.craftingOutputSlot, playerInventoryData.craftingOutputItemSlot);
      CraftingMenu_setCraftingMenuOutputItem(Game.definiteGameState.craftingOutputSlot);

      // Backpack slot
      Game.definiteGameState.backpackSlot = this.updateItemSlotFromServerData(Game.definiteGameState.backpackSlot, playerInventoryData.backpackSlot);
      Hotbar_updateBackpackItemSlot(Game.definiteGameState.backpackSlot);

      // Held item
      Game.definiteGameState.heldItemSlot = this.updateItemSlotFromServerData(Game.definiteGameState.heldItemSlot, playerInventoryData.heldItemSlot);
      setHeldItemVisual(Game.definiteGameState.heldItemSlot);
   }

   private static createItemFromServerItemData(serverItemEntityData: DroppedItemData): void {
      const position = Point.unpackage(serverItemEntityData.position); 
      const velocity = serverItemEntityData.velocity !== null ? Vector.unpackage(serverItemEntityData.velocity) : null;

      const containingChunks = new Set<Chunk>();
      for (const [chunkX, chunkY] of serverItemEntityData.chunkCoordinates) {
         const chunk = Game.board.getChunk(chunkX, chunkY);
         containingChunks.add(chunk);
      }

      const hitboxes = this.createHitboxesFromData(serverItemEntityData.hitboxes);

      const droppedItem = new DroppedItem(position, hitboxes, serverItemEntityData.id, velocity, serverItemEntityData.type);
      droppedItem.rotation = serverItemEntityData.rotation;
   }

   private static createProjectileFromServerData(projectileData: ProjectileData): void {
      const position = Point.unpackage(projectileData.position); 

      const containingChunks = new Set<Chunk>();
      for (const [chunkX, chunkY] of projectileData.chunkCoordinates) {
         const chunk = Game.board.getChunk(chunkX, chunkY);
         containingChunks.add(chunk);
      }

      const hitboxes = this.createHitboxesFromData(projectileData.hitboxes);

      createProjectile(position, hitboxes, projectileData.id, projectileData.type);
   }
   
   private static registerTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const tileUpdate of tileUpdates) {
         const tile = Game.board.getTile(tileUpdate.x, tileUpdate.y);
         tile.type = tileUpdate.type;
         tile.isWall = tileUpdate.isWall;
         
         updateRenderChunkFromTileBuffer(tileUpdate);
      }
   }

   private static createHitboxesFromData(hitboxDataArray: ReadonlyArray<HitboxData<HitboxType>>): Set<Hitbox<HitboxType>> {
      const hitboxes = new Set<Hitbox<HitboxType>>();
      for (const hitboxData of hitboxDataArray) {
         const hitboxInfo = this.createHitboxInfo(hitboxData);
         
         switch (hitboxInfo.type) {
            case "circular": {
               hitboxes.add(new CircularHitbox(hitboxInfo));
               break;
            }
            case "rectangular": {
               hitboxes.add(new RectangularHitbox(hitboxInfo));
               break;
            }
         }
      }
      return hitboxes;
   }

   public static createEntityFromData(entityData: EntityData<EntityType>): void {
      const position = Point.unpackage(entityData.position);

      const hitboxes = this.createHitboxesFromData(entityData.hitboxes);

      // Create the entity
      const entityConstructor = ENTITY_CLASS_RECORD[entityData.type]() as EntityClassType<typeof entityData.type>;
      const entity = new entityConstructor(position, hitboxes, entityData.id, entityData.secondsSinceLastHit, ...entityData.clientArgs);
      
      entity.velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      entity.acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null
      entity.rotation = entityData.rotation;
      entity.special = entityData.special;
   }

   private static createHitboxInfo(hitboxData: HitboxData<HitboxType>): HitboxInfo<HitboxType> {
      switch (hitboxData.type) {
         case "circular": {
            return {
               type: "circular",
               radius: hitboxData.radius,
               offset: typeof hitboxData.offset !== "undefined" ? Point.unpackage(hitboxData.offset) : undefined
            };
         }
         case "rectangular": {
            return {
               type: "rectangular",
               width: hitboxData.width,
               height: hitboxData.height,
               offset: typeof hitboxData.offset !== "undefined" ? Point.unpackage(hitboxData.offset) : undefined
            };
         }
      }
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
      updateHealthBar(Player.MAX_HEALTH);
      
      const spawnPosition = Point.unpackage(respawnDataPacket.spawnPosition);
      const player = new Player(spawnPosition, new Set(Player.HITBOXES), respawnDataPacket.playerID, null, Game.definiteGameState.playerUsername);
      Player.setInstancePlayer(player);

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
            rotation: Player.instance.rotation,
            visibleChunkBounds: Camera.getVisibleChunkBounds()
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

   public static sendCommand(command: string): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("command", command);
      }
   }
}

export default Client;