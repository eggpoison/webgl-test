import { io, Socket } from "socket.io-client";
import { AttackPacket, ClientToServerEvents, GameDataPacket, PlayerDataPacket, Point, EntityData, DroppedItemData, ServerToClientEvents, SETTINGS, ServerTileUpdateData, Vector, ServerTileData, HitboxType, InitialGameDataPacket, CraftingRecipe, GameDataSyncPacket, RespawnDataPacket, PlayerInventoryData, EntityType, HitboxData, HitboxInfo, ProjectileData, VisibleChunkBounds, ParticleData, TribeType, TribeData, InventoryData } from "webgl-test-shared";
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
import Item, { Inventory, ItemSlots } from "../items/Item";
import { updateActiveItem, updateInventoryIsOpen } from "../player-input";
import { Hotbar_updateArmourItemSlot, Hotbar_updateBackpackItemSlot, Hotbar_updateHotbarInventory } from "../components/game/inventories/Hotbar";
import { BackpackInventoryMenu_setBackpackInventory } from "../components/game/inventories/BackpackInventory";
import { setHeldItemVisual } from "../components/game/HeldItem";
import { CraftingMenu_setCraftingMenuOutputItem } from "../components/game/menus/CraftingMenu";
import { updateHealthBar } from "../components/game/HealthBar";
import { registerServerTick } from "../components/game/nerd-vision/GameInfoDisplay";
import { updateRenderChunkFromTileBuffer } from "../rendering/tile-rendering/solid-tile-rendering";
import createProjectile from "../projectiles/projectile-creation";
import Camera from "../Camera";
import { isDev } from "../utils";
import Particle from "../Particle";
import { updateTileAmbientOcclusion } from "../rendering/ambient-occlusion-rendering";
import Tribe from "../Tribe";

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
   
               try {
                  this.unloadGameDataPacket(gameDataPacket);
               } catch (error: unknown) {
                  console.warn(error);
                  throw new Error("Error when trying to unload game data packet!");
               }
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

            this.socket.on("force_position_update", (position: [number, number]): void => {
               if (Player.instance !== null) {
                  Player.instance.position.x = position[0];
                  Player.instance.position.y = position[1];
               }
            })
         }
      });
   }

   public static async requestSpawnPosition(): Promise<Point> {
      return new Promise(resolve => {
         if (this.socket === null) throw new Error("Socket hadn't been created when requesting game data")

         this.socket.emit("spawn_position_request");
         
         this.socket.off("spawn_position");
         this.socket.on("spawn_position", (spawnPositionPackaged: [number, number]) => {
            resolve(Point.unpackage(spawnPositionPackaged));
         });
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
            tiles[y][x] = new Tile(serverTileData.x, serverTileData.y, serverTileData.type, serverTileData.biomeName, serverTileData.isWall);
         }
      }
   
      return tiles;
   }

   public static unloadGameDataPacket(gameDataPacket: GameDataPacket): void {
      Game.ticks = gameDataPacket.serverTicks;
      Game.time = gameDataPacket.serverTime;

      if (isDev()) {
         Game.setGameObjectDebugData(gameDataPacket.gameObjectDebugData);
      }

      this.updateEntities(gameDataPacket.entityDataArray);
      this.updateDroppedItems(gameDataPacket.droppedItemDataArray);
      this.updateProjectiles(gameDataPacket.projectileDataArray);
      this.updateParticles(gameDataPacket.particles);
      
      this.updatePlayerInventory(gameDataPacket.inventory);
      this.registerTileUpdates(gameDataPacket.tileUpdates);

      this.updateTribe(gameDataPacket.tribeData);

      // Register hits
      for (const hitData of gameDataPacket.hitsTaken) {
         Player.registerHit(hitData);
      }

      if (Player.instance !== null) {
         if (gameDataPacket.hitsTaken.length >= 1) {
            Player.instance.secondsSinceLastHit = 0;
         }

         Player.instance.statusEffects = gameDataPacket.statusEffects;
      }


      Game.definiteGameState.setPlayerHealth(gameDataPacket.playerHealth);
      if (Game.definiteGameState.playerIsDead()) {
         gameScreenSetIsDead(true);
      
         // If the player's inventory is open, close it
         updateInventoryIsOpen(false);
      }
   }

   private static updateTribe(tribeData: TribeData | null): void {
      if (tribeData === null) {
         Game.tribe = null;
      } else {
         if (Player.instance !== null) {
            Player.instance.tribeID = tribeData.id;
         }
         
         if (Game.tribe === null) {
            // Create tribe
            Game.tribe = new Tribe(tribeData.tribeType, tribeData.numHuts)
         } else {
            // Update existing tribe
            Game.tribe.numHuts = tribeData.numHuts;
         }
      }
   }

   private static updateParticles(particles: ReadonlyArray<ParticleData>): void {
      const knownIDs = new Set(Object.keys(Game.board.particles).map(idString => Number(idString)));
      
      // Remove the player from the list of known entities so the player isn't removed
      if (Player.instance !== null) {
         knownIDs.delete(Player.instance.id);
      }

      // Update the game entities
      for (const particleData of particles) {// If it already exists, update it
         if (Game.board.particles.hasOwnProperty(particleData.id)) {
            Game.board.particles[particleData.id].updateFromData(particleData);
         } else {
            const particle = new Particle(particleData);
            Game.board.particles[particleData.id] = particle;
         }

         knownIDs.delete(particleData.id);
      }

      // All known entity ids which haven't been removed are ones which are dead
      for (const id of knownIDs) {
         delete Game.board.particles[id];
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
         Game.board.removeGameObject(Game.board.projectiles[id]);
      }
   }

   private static updateInventoryFromServerData(inventory: Inventory, inventoryData: InventoryData): void {
      // Remove any items which have been removed from the inventory
      for (const [itemSlot, item] of Object.entries(inventory.itemSlots) as unknown as ReadonlyArray<[number, Item]>) {
         // If it doesn't exist in the server data, remove it
         if (!inventoryData.itemSlots.hasOwnProperty(itemSlot) || inventoryData.itemSlots[itemSlot].id !== item.id) {
            delete inventory.itemSlots[itemSlot];
         }
      }

      // Add all new items from the server data
      for (const [itemSlot, itemData] of Object.entries(inventoryData.itemSlots).map(([itemSlot, itemData]) => [Number(itemSlot), itemData] as const)) {
         // If the item doesn't exist in the inventory, add it
         if (!inventory.itemSlots.hasOwnProperty(itemSlot) || inventory.itemSlots[itemSlot].id !== itemData.id) {
            inventory.itemSlots[itemSlot] = createItem(itemData.type, itemData.count, itemData.id);
         } else {
            // Otherwise the item needs to be updated with the new server data
            inventory.itemSlots[itemSlot].updateFromServerData(itemData);
         }
      }
   }
   
   private static createInventoryFromServerData(inventoryData: InventoryData): Inventory {
      const itemSlots: ItemSlots = {};

      // Add all new items from the server data
      for (const [itemSlot, itemData] of Object.entries(inventoryData.itemSlots).map(([itemSlot, itemData]) => [Number(itemSlot), itemData] as const)) {
         // If the item doesn't exist in the inventory, add it
         itemSlots[itemSlot] = createItem(itemData.type, itemData.count, itemData.id);
      }
      
      const inventory: Inventory = {
         itemSlots: itemSlots,
         width: inventoryData.width,
         height: inventoryData.height,
         inventoryName: inventoryData.inventoryName
      };
      return inventory;
   }

   private static updatePlayerInventory(playerInventoryData: PlayerInventoryData) {
      // Hotbar
      if (Game.definiteGameState.hotbar !== null) {
         this.updateInventoryFromServerData(Game.definiteGameState.hotbar, playerInventoryData.hotbar);
      } else {
         Game.definiteGameState.hotbar = this.createInventoryFromServerData(playerInventoryData.hotbar);
      }
      Hotbar_updateHotbarInventory(Game.definiteGameState.hotbar);

      updateActiveItem();

      // Backpack inventory
      if (Game.definiteGameState.backpack !== null) {
         this.updateInventoryFromServerData(Game.definiteGameState.backpack, playerInventoryData.backpackInventory);
         BackpackInventoryMenu_setBackpackInventory(Object.assign({}, Game.definiteGameState.backpack));
      }

      // Crafting output item
      if (Game.definiteGameState.craftingOutputSlot !== null) {
         this.updateInventoryFromServerData(Game.definiteGameState.craftingOutputSlot, playerInventoryData.craftingOutputItemSlot);
         CraftingMenu_setCraftingMenuOutputItem(Game.definiteGameState.craftingOutputSlot.itemSlots[1]);
      } else {
         Game.definiteGameState.craftingOutputSlot = this.createInventoryFromServerData(playerInventoryData.craftingOutputItemSlot);
      }
      CraftingMenu_setCraftingMenuOutputItem(Game.definiteGameState.craftingOutputSlot.itemSlots.hasOwnProperty(1) ? Game.definiteGameState.craftingOutputSlot.itemSlots[1] : null);

      // Backpack slot
      if (Game.definiteGameState.backpackSlot !== null) {
         this.updateInventoryFromServerData(Game.definiteGameState.backpackSlot, playerInventoryData.backpackSlot);
      } else {
         Game.definiteGameState.backpackSlot = this.createInventoryFromServerData(playerInventoryData.backpackSlot);
      }
      Hotbar_updateBackpackItemSlot(Game.definiteGameState.backpackSlot.itemSlots.hasOwnProperty(1) ? Game.definiteGameState.backpackSlot.itemSlots[1] : null);

      // Held item
      if (Game.definiteGameState.heldItemSlot !== null) {
         this.updateInventoryFromServerData(Game.definiteGameState.heldItemSlot, playerInventoryData.heldItemSlot);
      } else {
         Game.definiteGameState.heldItemSlot = this.createInventoryFromServerData(playerInventoryData.heldItemSlot);
      }
      setHeldItemVisual(Game.definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) ? Game.definiteGameState.heldItemSlot.itemSlots[1] : null);

      // Armour slot
      if (Game.definiteGameState.armourSlot !== null) {
         this.updateInventoryFromServerData(Game.definiteGameState.armourSlot, playerInventoryData.armourSlot);
      } else {
         Game.definiteGameState.armourSlot = this.createInventoryFromServerData(playerInventoryData.armourSlot);
      }
      Hotbar_updateArmourItemSlot(Game.definiteGameState.armourSlot);
      if (Player.instance !== null) {
         const armourType = Game.definiteGameState.armourSlot.itemSlots.hasOwnProperty(1) ? Game.definiteGameState.armourSlot.itemSlots[1].type : null;
         Player.instance.updateArmourRenderPart(armourType);
         Player.instance.armourType = armourType;
      }
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

         // Update the ambient occlusion of nearby tiles
         const minTileX = Math.max(tile.x - 1, 0);
         const maxTileX = Math.min(tile.x + 1, SETTINGS.BOARD_DIMENSIONS - 1);
         const minTileY = Math.max(tile.y - 1, 0);
         const maxTileY = Math.min(tile.y + 1, SETTINGS.BOARD_DIMENSIONS - 1);
         for (let tileY = maxTileY; tileY >= minTileY; tileY--) {
            for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
               updateTileAmbientOcclusion(tileX, tileY);
            }
         }
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
      const entityConstructor = ENTITY_CLASS_RECORD[entityData.type]() as EntityClassType<EntityType>;
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
      const player = new Player(spawnPosition, new Set(Player.HITBOXES), respawnDataPacket.playerID, null, null, TribeType.plainspeople, null, Game.definiteGameState.playerUsername);
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

   public static sendInitialPlayerData(username: string, visibleChunks: VisibleChunkBounds): void {
      // Send player data to the server
      if (this.socket !== null) {
         this.socket.emit("initial_player_data", username, visibleChunks);
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

   public static sendItemPickupPacket(entityID: number, inventoryName: string, itemSlot: number, amount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_pickup_packet", entityID, inventoryName, itemSlot, amount);
      }
   }

   public static sendItemReleasePacket(entityID: number, inventoryName: string, itemSlot: number, amount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_release_packet", entityID, inventoryName, itemSlot, amount);
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

   public static sendTrackGameObject(id: number | null): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("track_game_object", id);
      }
   }
}

export default Client;