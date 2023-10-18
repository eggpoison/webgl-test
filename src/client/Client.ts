import { io, Socket } from "socket.io-client";
import { AttackPacket, ClientToServerEvents, GameDataPacket, PlayerDataPacket, Point, EntityData, DroppedItemData, ServerToClientEvents, SETTINGS, ServerTileUpdateData, ServerTileData, InitialGameDataPacket, GameDataSyncPacket, RespawnDataPacket, PlayerInventoryData, EntityType, ProjectileData, VisibleChunkBounds, TribeType, TribeData, InventoryData, CircularHitboxData, RectangularHitboxData, randFloat, RESOURCE_ENTITY_TYPES, MOB_ENTITY_TYPES, TribeMemberAction } from "webgl-test-shared";
import { setGameState, setLoadingScreenInitialStatus } from "../components/App";
import Player from "../entities/Player";
import ENTITY_CLASS_RECORD, { EntityClassType } from "../entity-class-record";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import DroppedItem from "../items/DroppedItem";
import { Tile } from "../Tile";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import { Inventory } from "../items/Item";
import { getInteractEntityID, updateInventoryIsOpen } from "../player-input";
import { Hotbar_update } from "../components/game/inventories/Hotbar";
import { setHeldItemVisual } from "../components/game/HeldItem";
import { CraftingMenu_setCraftingMenuOutputItem } from "../components/game/menus/CraftingMenu";
import { HealthBar_setHasFrostShield, updateHealthBar } from "../components/game/HealthBar";
import { registerServerTick, updateDebugScreenCurrentTime, updateDebugScreenTicks } from "../components/game/dev/GameInfoDisplay";
import createProjectile from "../projectiles/projectile-creation";
import Camera from "../Camera";
import { isDev } from "../utils";
import Tribe from "../Tribe";
import { updateRenderChunkFromTileUpdate } from "../rendering/tile-rendering/render-chunks";
import Entity from "../entities/Entity";
import Board from "../Board";
import { definiteGameState, latencyGameState } from "../game-state/game-states";
import { BackpackInventoryMenu_update } from "../components/game/inventories/BackpackInventory";
import { createWhiteSmokeParticle } from "../generic-particles";
import Particle from "../Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { calculateDroppedItemRenderDepth, calculateEntityRenderDepth, calculateProjectileRenderDepth } from "../render-layers";

const BUILDING_TYPES: ReadonlyArray<EntityType> = ["barrel", "campfire", "furnace", "tribe_totem", "tribe_hut", "workbench"];

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
               if (Game.getIsPaused() || !Game.isRunning || !Game.isSynced || document.visibilityState === "hidden") return;

               registerServerTick();

               Game.queuedPackets.push(gameDataPacket);
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
      Board.ticks = gameDataPacket.serverTicks;
      updateDebugScreenTicks(gameDataPacket.serverTicks);
      Board.time = gameDataPacket.serverTime;
      updateDebugScreenCurrentTime(gameDataPacket.serverTime);

      if (isDev()) {
         Game.setGameObjectDebugData(gameDataPacket.gameObjectDebugData);
      }

      // Register deaths
      for (const killedEntityID of gameDataPacket.killedEntityIDs) {
         if (Board.entities.hasOwnProperty(killedEntityID)) {
            const entity = Board.entities[killedEntityID];
            if (typeof entity.onDie !== "undefined") {
               entity.onDie();
            }
         }
      }

      this.updateEntities(gameDataPacket.entityDataArray);
      this.updateDroppedItems(gameDataPacket.droppedItemDataArray);
      this.updateProjectiles(gameDataPacket.projectileDataArray);
      
      this.updatePlayerInventory(gameDataPacket.inventory);
      this.registerTileUpdates(gameDataPacket.tileUpdates);

      this.updateTribe(gameDataPacket.tribeData);

      definiteGameState.setPlayerHealth(gameDataPacket.playerHealth);
      if (Player.instance !== null && definiteGameState.playerIsDead()) {
         this.killPlayer();
      }

      HealthBar_setHasFrostShield(gameDataPacket.hasFrostShield);
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

   /**
    * Updates the client's entities to match those in the server
    */
   private static updateEntities(entityDataArray: ReadonlyArray<EntityData<EntityType>>): void {
      const knownEntityIDs = new Set(Object.keys(Board.entities).map(idString => Number(idString)));
      
      // Remove the player from the list of known entities so the player isn't removed
      if (Player.instance !== null) {
         knownEntityIDs.delete(Player.instance.id);
      }

      // Update the game entities
      for (const entityData of entityDataArray) {
         // If it already exists, update it
         if (Board.entities.hasOwnProperty(entityData.id)) {
            // @Cleanup: This is very messy and unmaintainable. Doing the hit and healing particle logic outside
            // of the updateFromData function is done as the player instance right now can't use the updateFromData
            // function, doing so would cause a circular dependency with TribeMember <-> Player.
            
            // We don't want the player to be updated from the server data
            if (Board.entities[entityData.id] !== Player.instance) {
               Board.entities[entityData.id].updateFromData(entityData);
            } else {
               if ((Board.entities[entityData.id] as Player).hasFrostShield && !entityData.clientArgs[9]) {
                  (Board.entities[entityData.id] as Player).createFrostShieldBreakParticles();
               }
               (Board.entities[entityData.id] as Player).hasFrostShield = entityData.clientArgs[9] as boolean;
            }
            for (const hit of entityData.hitsTaken) {
               Board.entities[entityData.id].registerHit(hit);
            }
            if (entityData.amountHealed > 0) {
               Board.entities[entityData.id].createHealingParticles(entityData.amountHealed);
            }
            Board.entities[entityData.id].statusEffects = entityData.statusEffects;
         } else {
            const entity = this.createEntityFromData(entityData);
            for (const hit of entityData.hitsTaken) {
               entity.registerHit(hit);
            }
         }

         knownEntityIDs.delete(entityData.id);
      }

      // All known entity ids which haven't been removed are ones which are dead
      for (const id of knownEntityIDs) {
         if (Board.entities[id].type === "player") {
            const idx = Board.players.indexOf(Board.entities[id] as Player);
            if (idx !== -1) {
               Board.players.splice(idx, 1);
            }
         }
         Board.removeGameObject(Board.entities[id]);
         delete Board.entities[id];
      }
   }

   private static updateDroppedItems(serverItemEntityDataArray: ReadonlyArray<DroppedItemData>): void {
      const ids = new Set(Object.keys(Board.droppedItems).map(idString => Number(idString)));

      for (const serverItemData of serverItemEntityDataArray) {
         if (!ids.has(serverItemData.id)) {
            // New item
            this.createDroppedItemFromServerItemData(serverItemData);
         } else {
            // Otherwise update it
            if (Board.droppedItems.hasOwnProperty(serverItemData.id)) {
               const itemEntity = Board.droppedItems[serverItemData.id];
               itemEntity.updateFromData(serverItemData);
            }
         }

         ids.delete(serverItemData.id);
      }

      // All known entity ids which haven't been removed are ones which are dead
      for (const id of ids) {
         Board.removeGameObject(Board.droppedItems[id]);
         delete Board.droppedItems[id];
      }
   }

   private static updateProjectiles(projectilesDataArray: ReadonlyArray<ProjectileData>): void {
      const ids = new Set(Object.keys(Board.projectiles).map(idString => Number(idString)));

      for (const projectileData of projectilesDataArray) {
         if (!ids.has(projectileData.id)) {
            // New projectile
            this.createProjectileFromServerData(projectileData);
         } else {
            // Otherwise update it
            const projectile = Board.projectiles[projectileData.id];
            projectile.updateFromData(projectileData);
         }

         ids.delete(projectileData.id);
      }

      // All known entity ids which haven't been removed are ones which are dead
      for (const id of ids) {
         Board.removeGameObject(Board.projectiles[id]);
         delete Board.projectiles[id];
      }
   }

   private static updatePlayerInventory(playerInventoryData: PlayerInventoryData) {
      const hotbarHasChanged = this.inventoryHasChanged(definiteGameState.hotbar, playerInventoryData.hotbar);
      updateInventoryFromData(definiteGameState.hotbar, playerInventoryData.hotbar);

      const backpackHasChanged = this.inventoryHasChanged(definiteGameState.backpack, playerInventoryData.backpackInventory);
      if (definiteGameState.backpack !== null) {
         updateInventoryFromData(definiteGameState.backpack, playerInventoryData.backpackInventory);
      } else {
         definiteGameState.backpack = createInventoryFromData(playerInventoryData.backpackInventory);
      }

      // Crafting output item
      if (definiteGameState.craftingOutputSlot !== null) {
         updateInventoryFromData(definiteGameState.craftingOutputSlot, playerInventoryData.craftingOutputItemSlot);
      } else {
         definiteGameState.craftingOutputSlot = createInventoryFromData(playerInventoryData.craftingOutputItemSlot);
      }
      CraftingMenu_setCraftingMenuOutputItem(definiteGameState.craftingOutputSlot.itemSlots.hasOwnProperty(1) ? definiteGameState.craftingOutputSlot.itemSlots[1] : null);

      // Backpack slot
      const backpackSlotHasChanged = this.inventoryHasChanged(definiteGameState.backpackSlot, playerInventoryData.backpackSlot);
      updateInventoryFromData(definiteGameState.backpackSlot, playerInventoryData.backpackSlot);

      // Held item
      updateInventoryFromData(definiteGameState.heldItemSlot, playerInventoryData.heldItemSlot);
      setHeldItemVisual(definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) ? definiteGameState.heldItemSlot.itemSlots[1] : null);

      // Armour slot
      const armourSlotHasChanged = this.inventoryHasChanged(definiteGameState.armourSlot, playerInventoryData.armourSlot);
      updateInventoryFromData(definiteGameState.armourSlot, playerInventoryData.armourSlot);
      
      if (Player.instance !== null && armourSlotHasChanged) {
         updateInventoryFromData(Player.instance.armourSlotInventory, playerInventoryData.armourSlot);
      }

      if (hotbarHasChanged || backpackSlotHasChanged || armourSlotHasChanged) {
         Hotbar_update();
      }
      // @Cleanup is the backpackSlotHasChanged check really necessary?
      if (backpackHasChanged || backpackSlotHasChanged) {
         BackpackInventoryMenu_update();
      }
   }

   private static inventoryHasChanged(previousInventory: Inventory | null, newInventoryData: InventoryData): boolean {
      // If the previous inventory is null, check if there are any items in the new inventory data
      if (previousInventory === null) {
         for (let itemSlot = 1; itemSlot <= newInventoryData.width * newInventoryData.height; itemSlot++) {
            if (newInventoryData.itemSlots.hasOwnProperty(itemSlot)) {
               return true;
            }
         }
         return false;
      }
      
      for (let itemSlot = 1; itemSlot <= newInventoryData.width * newInventoryData.height; itemSlot++) {
         if (!newInventoryData.itemSlots.hasOwnProperty(itemSlot)) {
            // If there is no item in the server data but there is one in the game state
            if (previousInventory.itemSlots.hasOwnProperty(itemSlot)) {
               return true;
            }

            // Since we then know both inventories don't have an item there, we don't do any other checks
            continue;
         }

         // If the item has changed, update it
         if (previousInventory.itemSlots.hasOwnProperty(itemSlot)) {
            // Update type
            if (newInventoryData.itemSlots[itemSlot].type !== previousInventory.itemSlots[itemSlot].type) {
               return true;
            }
            // Update count
            if (newInventoryData.itemSlots[itemSlot].count !== previousInventory.itemSlots[itemSlot].count) {
               return true;
            }
         } else {
            // Server inventory data has item but game state doesn't
            return true;
         }
      }
      return false;
   }

   private static createDroppedItemFromServerItemData(droppedItemData: DroppedItemData): void {
      const position = Point.unpackage(droppedItemData.position); 
      const velocity = Point.unpackage(droppedItemData.velocity);

      const hitboxes = this.createHitboxesFromData(droppedItemData.hitboxes);

      const renderDepth = calculateDroppedItemRenderDepth();
      const droppedItem = new DroppedItem(position, hitboxes, droppedItemData.id, renderDepth, velocity, droppedItemData.type);
      droppedItem.rotation = droppedItemData.rotation;
      droppedItem.mass = droppedItemData.mass;
      droppedItem.ageTicks = droppedItemData.ageTicks;

      Board.addDroppedItem(droppedItem);
   }

   private static createProjectileFromServerData(projectileData: ProjectileData): void {
      // @Speed: Garbage collection
      
      const position = Point.unpackage(projectileData.position); 

      const hitboxes = this.createHitboxesFromData(projectileData.hitboxes);

      const renderDepth = calculateProjectileRenderDepth();
      const projectile = createProjectile(position, hitboxes, projectileData.id, renderDepth, projectileData.data, projectileData.type);
      projectile.rotation = projectileData.rotation;
      projectile.velocity = Point.unpackage(projectileData.velocity);
      projectile.mass = projectileData.mass;
      projectile.ageTicks = projectileData.ageTicks;

      Board.addProjectile(projectile);
   }
   
   private static registerTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const tileUpdate of tileUpdates) {
         const tileX = tileUpdate.tileIndex % SETTINGS.BOARD_DIMENSIONS;
         const tileY = Math.floor(tileUpdate.tileIndex / SETTINGS.BOARD_DIMENSIONS);
         const tile = Board.getTile(tileX, tileY);
         tile.type = tileUpdate.type;
         tile.isWall = tileUpdate.isWall;
         
         updateRenderChunkFromTileUpdate(tileUpdate);
      }
   }

   private static createHitboxesFromData(hitboxDataArray: ReadonlyArray<CircularHitboxData | RectangularHitboxData>): Set<CircularHitbox | RectangularHitbox> {
      const hitboxes = new Set<CircularHitbox | RectangularHitbox>();
      for (const hitboxData of hitboxDataArray) {
         const offset = (typeof hitboxData.offsetX !== "undefined" || typeof hitboxData.offsetY !== "undefined") ? new Point(hitboxData.offsetX || 0, hitboxData.offsetY || 0) : undefined;
         if (hitboxData.hasOwnProperty("radius")) {
            // Circular
            const hitbox = new CircularHitbox();
            hitbox.radius = (hitboxData as CircularHitboxData).radius;
            hitbox.offset = offset;
            hitboxes.add(hitbox);
         } else {
            // Rectangular
            hitboxes.add(new RectangularHitbox((hitboxData as RectangularHitboxData).width, (hitboxData as RectangularHitboxData).height, offset));
         }
      }
      return hitboxes;
   }

   public static createEntityFromData(entityData: EntityData<EntityType>): Entity {
      // @Speed: Garbage collection
      
      const position = Point.unpackage(entityData.position);

      const hitboxes = this.createHitboxesFromData(entityData.hitboxes);

      const renderDepth = calculateEntityRenderDepth(entityData.type);

      // Create the entity
      const entityConstructor = ENTITY_CLASS_RECORD[entityData.type]() as EntityClassType<EntityType>;
      const entity = new entityConstructor(position, hitboxes, entityData.id, renderDepth, ...entityData.clientArgs);
      
      entity.velocity = Point.unpackage(entityData.velocity);
      entity.rotation = entityData.rotation;
      entity.mass = entityData.mass;
      entity.ageTicks = entityData.ageTicks;

      Board.addEntity(entity);
      if (entity.type === "player") {
         Board.players.push(entity as Player);
      }

      // If the entity has just spawned in, create white smoke particles.
      // Only create particles for living entities: e.g. cows, tribesmen, etc.
      if (entityData.ageTicks === 0 && !RESOURCE_ENTITY_TYPES.includes(entityData.type) && (MOB_ENTITY_TYPES.includes(entityData.type) || entityData.type === "player" || entityData.type === "tribesman" || BUILDING_TYPES.includes(entityData.type))) {
         const strength = 0.8 * entity.mass;
         
         // White smoke particles
         for (let i = 0; i < 10; i++) {
            const spawnPositionX = entity.position.x;
            const spawnPositionY = entity.position.y;
            createWhiteSmokeParticle(spawnPositionX, spawnPositionY, strength);
         }

         // Speck particles
         for (let i = 0; i < 20; i++) {
            const spawnPositionX = entity.position.x;
            const spawnPositionY = entity.position.y;

            const velocityMagnitude = randFloat(80, 160) * strength;
            const velocityDirection = 2 * Math.PI * Math.random();
            const velocityX = velocityMagnitude * Math.sin(velocityDirection);
            const velocityY = velocityMagnitude * Math.cos(velocityDirection);

            const lifetime = Math.pow(strength, 0.75);
            
            const particle = new Particle(lifetime);
            particle.getOpacity = () => {
               return 1 - Math.pow(particle.age / lifetime, 2);
            }

            addMonocolourParticleToBufferContainer(
               particle,
               ParticleRenderLayer.low,
               4, 4,
               spawnPositionX, spawnPositionY,
               velocityX, velocityY,
               0, 0,
               velocityMagnitude / lifetime / 1.2,
               2 * Math.PI * Math.random(),
               randFloat(-Math.PI, Math.PI),
               0,
               Math.PI,
               1,
               1,
               1
            );
            Board.lowMonocolourParticles.push(particle);
         }
      }

      return entity;
   }

   private static registerGameDataSyncPacket(gameDataSyncPacket: GameDataSyncPacket): void {
      if (!Game.isRunning) return;

      if (Player.instance !== null) {
         Player.instance.position = Point.unpackage(gameDataSyncPacket.position);
         Player.instance.velocity = Point.unpackage(gameDataSyncPacket.velocity);
         Player.instance.acceleration = Point.unpackage(gameDataSyncPacket.acceleration)
         Player.instance.rotation = gameDataSyncPacket.rotation;
         Player.instance.terminalVelocity = gameDataSyncPacket.terminalVelocity;
         this.updatePlayerInventory(gameDataSyncPacket.inventory);
         
         definiteGameState.setPlayerHealth(gameDataSyncPacket.health);
         if (definiteGameState.playerIsDead()) {
            this.killPlayer();
         }
      }

      Game.sync();
   }

   private static respawnPlayer(respawnDataPacket: RespawnDataPacket): void {
      definiteGameState.setPlayerHealth(Player.MAX_HEALTH);
      updateHealthBar(Player.MAX_HEALTH);
      
      const spawnPosition = Point.unpackage(respawnDataPacket.spawnPosition);
      const renderDepth = calculateEntityRenderDepth("player");
      const player = new Player(spawnPosition, new Set([Player.createNewPlayerHitbox()]), respawnDataPacket.playerID, renderDepth, null, TribeType.plainspeople, {itemSlots: {}, width: 1, height: 1, inventoryName: "armourSlot"}, {itemSlots: {}, width: 1, height: 1, inventoryName: "backpackSlot"}, {itemSlots: {}, width: 1, height: 1, inventoryName: "backpack"}, null, TribeMemberAction.none, -1, -99999, false, -1, definiteGameState.playerUsername);
      Player.setInstancePlayer(player);
      Board.addEntity(player);

      gameScreenSetIsDead(false);

      // Clear any queued packets, as they contain data from when the player wasn't respawned.
      Game.queuedPackets.splice(0, Game.queuedPackets.length);
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
            velocity: Player.instance.velocity.package() || null,
            acceleration: Player.instance.acceleration.package() || null,
            terminalVelocity: Player.instance.terminalVelocity,
            rotation: Player.instance.rotation,
            visibleChunkBounds: Camera.getVisibleChunkBounds(),
            selectedItemSlot: latencyGameState.selectedHotbarItemSlot,
            action: latencyGameState.playerAction,
            interactingEntityID: getInteractEntityID()
         };

         this.socket.emit("player_data_packet", packet);
      }
   }

   public static sendCraftingPacket(recipeIndex: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("crafting_packet", recipeIndex);
      }
   }

   public static sendItemPickupPacket(entityID: number, inventoryName: string, itemSlot: number, amount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_pickup", entityID, inventoryName, itemSlot, amount);
      }
   }

   public static sendItemReleasePacket(entityID: number, inventoryName: string, itemSlot: number, amount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_release", entityID, inventoryName, itemSlot, amount);
      }
   }

   public static sendAttackPacket(attackPacket: AttackPacket): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("attack_packet", attackPacket);
      }
   }

   public static sendItemUsePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         const itemSlot = latencyGameState.selectedHotbarItemSlot;
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
      if (Game.isRunning && Client.socket !== null) {
         Client.socket.emit("respawn");
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

   private static killPlayer(): void {
      // Remove the player from the game
      Board.removeGameObject(Player.instance!);
      delete Board.entities[Player.instance!.id];
      Player.instance = null;

      latencyGameState.resetFlags();
      definiteGameState.resetFlags();

      gameScreenSetIsDead(true);
      updateInventoryIsOpen(false);
   }
}

export default Client;