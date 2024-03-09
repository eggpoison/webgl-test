import { io, Socket } from "socket.io-client";
import { AttackPacket, ClientToServerEvents, GameDataPacket, PlayerDataPacket, Point, EntityData, ServerToClientEvents, SETTINGS, ServerTileUpdateData, ServerTileData, InitialGameDataPacket, GameDataSyncPacket, RespawnDataPacket, PlayerInventoryData, EntityType, VisibleChunkBounds, TribeType, TribeData, InventoryData, TribeMemberAction, TechID, Inventory, TRIBE_INFO_RECORD, BuildingShapeType, randInt, StatusEffect, STRUCTURE_TYPES, COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared";
import { setGameState, setLoadingScreenInitialStatus } from "../components/App";
import Player from "../entities/Player";
import ENTITY_CLASS_RECORD, { EntityClassType } from "../entity-class-record";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { Tile } from "../Tile";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import { removeSelectedItem, selectItem, updateInventoryIsOpen } from "../player-input";
import { Hotbar_setHotbarSelectedItemSlot, Hotbar_update, Hotbar_updateLeftThrownBattleaxeItemID, Hotbar_updateRightThrownBattleaxeItemID } from "../components/game/inventories/Hotbar";
import { setHeldItemVisual } from "../components/game/HeldItem";
import { CraftingMenu_setCraftingMenuOutputItem } from "../components/game/menus/CraftingMenu";
import { HealthBar_setHasFrostShield, updateHealthBar } from "../components/game/HealthBar";
import { registerServerTick, updateDebugScreenCurrentTime, updateDebugScreenTicks } from "../components/game/dev/GameInfoDisplay";
import Camera from "../Camera";
import { isDev } from "../utils";
import { updateRenderChunkFromTileUpdate } from "../rendering/render-chunks";
import Board from "../Board";
import { definiteGameState, latencyGameState } from "../game-state/game-states";
import { BackpackInventoryMenu_update } from "../components/game/inventories/BackpackInventory";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { calculateEntityRenderDepth } from "../render-layers";
import GameObject from "../GameObject";
import { createDamageNumber, createHealNumber, createResearchNumber } from "../text-canvas";
import { playSound } from "../sound";
import { closeTechTree, updateTechTree } from "../components/game/TechTree";
import { TechInfocard_setSelectedTech } from "../components/game/TechInfocard";
import { getSelectedEntityID } from "../entity-selection";
import { setVisiblePathfindingNodeOccupances } from "../rendering/pathfinding-node-rendering";

type ISocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type GameData = {
   readonly gameTicks: number;
   readonly tiles: Array<Array<Tile>>;
   readonly playerID: number;
}

const shouldShowDamageNumber = (attackerID: number): boolean => {
   if (Player.instance !== null && attackerID === Player.instance.id) {
      return true;
   }

   // Show friendly turrets' damage numbers
   if (Board.entityRecord.hasOwnProperty(attackerID)) {
      const entity = Board.entityRecord[attackerID];
      if ((entity.type === EntityType.slingTurret || entity.type === EntityType.ballista) && (entity as any).tribeID === Game.tribe.id) {
         return true;
      }
   }

   return false;
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
   public static parseServerTileDataArray(serverTileDataArray: ReadonlyArray<ServerTileData>): Array<Array<Tile>> {
      const tiles = new Array<Array<Tile>>();
   
      for (let tileIndex = 0; tileIndex < SETTINGS.BOARD_DIMENSIONS * SETTINGS.BOARD_DIMENSIONS; tileIndex++) {
         const serverTileData = serverTileDataArray[tileIndex];
         
         const x = tileIndex % SETTINGS.BOARD_DIMENSIONS;
         const y = Math.floor(tileIndex / SETTINGS.BOARD_DIMENSIONS);
         if (typeof tiles[x] === "undefined") {
            tiles.push([]);
         }

         const tile = new Tile(x, y, serverTileData.type, serverTileData.biomeName, serverTileData.isWall);
         tiles[x].push(tile);
      }
   
      return tiles;
   }

   public static processGameDataPacket(gameDataPacket: GameDataPacket): void {
      Board.ticks = gameDataPacket.serverTicks;
      updateDebugScreenTicks(gameDataPacket.serverTicks);
      Board.time = gameDataPacket.serverTime;
      updateDebugScreenCurrentTime(gameDataPacket.serverTime);

      if (isDev()) {
         Game.setGameObjectDebugData(gameDataPacket.entityDebugData);
      }

      this.updateEntities(gameDataPacket.entityDataArray);
      
      this.updatePlayerInventory(gameDataPacket.inventory);
      this.registerTileUpdates(gameDataPacket.tileUpdates);

      this.updateTribe(gameDataPacket.tribeData);

      definiteGameState.setPlayerHealth(gameDataPacket.playerHealth);
      if (Player.instance !== null && definiteGameState.playerIsDead()) {
         this.killPlayer();
      }

      HealthBar_setHasFrostShield(gameDataPacket.hasFrostShield);

      // Register hits
      for (const hitData of gameDataPacket.hits) {
         // Register hit
         if (Board.entityRecord.hasOwnProperty(hitData.hitEntityID)) {
            const entity = Board.entityRecord[hitData.hitEntityID];
            entity.registerHit(hitData);
         }

         if (shouldShowDamageNumber(hitData.attackerID)) {
            if (Board.entityRecord.hasOwnProperty(hitData.hitEntityID)) {
               const entity = Board.entityRecord[hitData.hitEntityID];
               createDamageNumber(entity.position.x, entity.position.y, hitData.damage);
            } else {
               createDamageNumber(hitData.entityPositionX, hitData.entityPositionY, hitData.damage);
            }
         }
      }

      // Register heals
      for (const healData of gameDataPacket.heals) {
         if (healData.healAmount === 0) {
            continue;
         }

         if (Player.instance !== null && healData.healerID === Player.instance.id) {
            createHealNumber(healData.healedID, healData.entityPositionX, healData.entityPositionY, healData.healAmount);
         }

         if (Board.entityRecord.hasOwnProperty(healData.healedID)) {
            const healedEntity = Board.entityRecord[healData.healedID];
            healedEntity.createHealingParticles(healData.healAmount);

            // @Hack @Incomplete: This will trigger the repair sound effect even if a hammer isn't the one healing the structure
            if (STRUCTURE_TYPES.includes(healedEntity.type as any)) { // @Cleanup
               playSound("repair.mp3", 0.4, 1, healData.entityPositionX, healData.entityPositionY);
            }
         }
      }

      // Register orb completes
      for (const orbCompleteData of gameDataPacket.orbCompletes) {
         createResearchNumber(orbCompleteData.x, orbCompleteData.y, orbCompleteData.amount);
      }

      if (gameDataPacket.pickedUpItem) {
         playSound("item-pickup.mp3", 0.3, 1, Camera.position.x, Camera.position.y);
      }

      definiteGameState.hotbarCrossbowLoadProgressRecord = gameDataPacket.hotbarCrossbowLoadProgressRecord;

      setVisiblePathfindingNodeOccupances(gameDataPacket.visiblePathfindingNodeOccupances);
   }

   private static updateTribe(tribeData: TribeData): void {
      if (Player.instance !== null) {
         Player.instance.tribeID = tribeData.id;
      }
      
      Game.tribe.hasTotem = tribeData.hasTotem;
      Game.tribe.numHuts = tribeData.numHuts;
      Game.tribe.selectedTechID = tribeData.selectedTechID;
      Game.tribe.unlockedTechs = tribeData.unlockedTechs;
      Game.tribe.techTreeUnlockProgress = tribeData.techTreeUnlockProgress;

      updateTechTree();
      TechInfocard_setSelectedTech(Game.tribe.selectedTechID);
   }

   /**
    * Updates the client's entities to match those in the server
    */
   private static updateEntities(entityDataArray: ReadonlyArray<EntityData<EntityType>>): void {
      const knownEntityIDs = new Set(Object.keys(Board.entityRecord).map(idString => Number(idString)));
      
      // Remove the player from the list of known entities so the player isn't removed
      if (Player.instance !== null) {
         knownEntityIDs.delete(Player.instance.id);
      }

      // Update the game entities
      for (const entityData of entityDataArray) {
         // If it already exists, update it
         if (Board.entityRecord.hasOwnProperty(entityData.id)) {
            if (Board.entityRecord[entityData.id] !== Player.instance) {
               Board.entityRecord[entityData.id].updateFromData(entityData);
            } else {
               const player = (Board.entityRecord[entityData.id] as Player);

               player.genericUpdateFromData(entityData as unknown as EntityData<EntityType.player>);

               // @Cleanup @Hack
               const rightThrownBattleaxeItemID = entityData.clientArgs[9];
               player.rightThrownBattleaxeItemID = rightThrownBattleaxeItemID;
               Hotbar_updateRightThrownBattleaxeItemID(rightThrownBattleaxeItemID);
               const leftThrownBattleaxeItemID = entityData.clientArgs[14] as number;
               player.leftThrownBattleaxeItemID = leftThrownBattleaxeItemID;
               Hotbar_updateLeftThrownBattleaxeItemID(leftThrownBattleaxeItemID);
            }

            const entity = Board.entityRecord[entityData.id];

            for (const statusEffectData of entityData.statusEffects) {
               if (!entity.hasStatusEffect(statusEffectData.type)) {
                  switch (statusEffectData.type) {
                     case StatusEffect.freezing: {
                        playSound("freezing.mp3", 0.4, 1, entity.position.x, entity.position.y)
                        break;
                     }
                  }
               }
            }
            
            entity.statusEffects = entityData.statusEffects;
         } else {
            this.createEntityFromData(entityData);
         }

         knownEntityIDs.delete(entityData.id);
      }

      // All known entity ids which haven't been removed are ones which are dead
      for (const id of knownEntityIDs) {
         const entity = Board.entityRecord[id];
         Board.removeGameObject(entity);
      }
   }

   private static updatePlayerInventory(playerInventoryData: PlayerInventoryData) {
      // Call the remove function if the selected item has been removed, and the select function for new selected item slots
      if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot) && !playerInventoryData.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         const item = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
         removeSelectedItem(item);
      } else if (!definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot) && playerInventoryData.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         const item = playerInventoryData.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
         selectItem(item);
      }

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
      CraftingMenu_setCraftingMenuOutputItem(definiteGameState.craftingOutputSlot?.itemSlots.hasOwnProperty(1) ? definiteGameState.craftingOutputSlot.itemSlots[1] : null);

      // Backpack slot
      const backpackSlotHasChanged = this.inventoryHasChanged(definiteGameState.backpackSlot, playerInventoryData.backpackSlot);
      updateInventoryFromData(definiteGameState.backpackSlot, playerInventoryData.backpackSlot);

      // Held item
      updateInventoryFromData(definiteGameState.heldItemSlot, playerInventoryData.heldItemSlot);
      setHeldItemVisual(definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) ? definiteGameState.heldItemSlot.itemSlots[1] : null);

      // Armour slot
      const armourSlotHasChanged = this.inventoryHasChanged(definiteGameState.armourSlot, playerInventoryData.armourSlot);
      updateInventoryFromData(definiteGameState.armourSlot, playerInventoryData.armourSlot);

      // Glove slot
      const gloveSlotHasChanged = this.inventoryHasChanged(definiteGameState.gloveSlot, playerInventoryData.gloveSlot);
      updateInventoryFromData(definiteGameState.gloveSlot, playerInventoryData.gloveSlot);

      // Offhand
      const offhandHasChanged = this.inventoryHasChanged(definiteGameState.offhandInventory, playerInventoryData.offhand);
      updateInventoryFromData(definiteGameState.offhandInventory, playerInventoryData.offhand);
      
      if (Player.instance !== null && armourSlotHasChanged) {
         updateInventoryFromData(Player.instance.armourSlotInventory, playerInventoryData.armourSlot);
      }

      if (hotbarHasChanged || backpackSlotHasChanged || armourSlotHasChanged || offhandHasChanged || gloveSlotHasChanged) {
         Hotbar_update();
      }
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

   private static createEntityFromData(entityData: EntityData): void {
      const position = Point.unpackage(entityData.position); 

      const renderDepth = calculateEntityRenderDepth(entityData.type);

      // Create the entity
      const entityConstructor = ENTITY_CLASS_RECORD[entityData.type]() as EntityClassType<EntityType>;
      const entity = new entityConstructor(position, entityData.id, entityData.ageTicks, renderDepth, ...entityData.clientArgs);

      entity.velocity = Point.unpackage(entityData.velocity);
      entity.rotation = entityData.rotation;
      entity.collisionBit = entityData.collisionBit;
      entity.collisionMask = entityData.collisionMask;

      this.addHitboxesToGameObject(entity, entityData);

      Board.addEntity(entity);

      if (entityData.type === EntityType.player) {
         Board.players.push(entity as Player);
      }
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

   private static addHitboxesToGameObject(gameObject: GameObject, data: EntityData): void {
      for (let i = 0; i < data.circularHitboxes.length; i++) {
         const hitboxData = data.circularHitboxes[i];

         const hitbox = new CircularHitbox(hitboxData.mass, hitboxData.radius, hitboxData.localID);
         hitbox.offset.x = hitboxData.offsetX;
         hitbox.offset.y = hitboxData.offsetY;

         gameObject.addCircularHitbox(hitbox);
      }

      for (let i = 0; i < data.rectangularHitboxes.length; i++) {
         const hitboxData = data.rectangularHitboxes[i];

         const hitbox = new RectangularHitbox(hitboxData.mass, hitboxData.width, hitboxData.height, hitboxData.localID);
         hitbox.offset.x = hitboxData.offsetX;
         hitbox.offset.y = hitboxData.offsetY;
         hitbox.rotation = hitboxData.rotation;

         gameObject.addRectangularHitbox(hitbox);
      }
   }

   private static registerGameDataSyncPacket(gameDataSyncPacket: GameDataSyncPacket): void {
      if (!Game.isRunning) return;

      if (Player.instance !== null) {
         Player.instance.position = Point.unpackage(gameDataSyncPacket.position);
         Player.instance.velocity = Point.unpackage(gameDataSyncPacket.velocity);
         Player.instance.acceleration = Point.unpackage(gameDataSyncPacket.acceleration)
         Player.instance.rotation = gameDataSyncPacket.rotation;
         this.updatePlayerInventory(gameDataSyncPacket.inventory);
         
         definiteGameState.setPlayerHealth(gameDataSyncPacket.health);
         if (definiteGameState.playerIsDead()) {
            this.killPlayer();
         }
      }

      Game.sync();
   }

   private static respawnPlayer(respawnDataPacket: RespawnDataPacket): void {
      latencyGameState.selectedHotbarItemSlot = 1;
      Hotbar_setHotbarSelectedItemSlot(1);
      
      const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
      definiteGameState.setPlayerHealth(maxHealth);
      updateHealthBar(maxHealth);
      
      const spawnPosition = Point.unpackage(respawnDataPacket.spawnPosition);
      const renderDepth = calculateEntityRenderDepth(EntityType.player);
      const player = new Player(spawnPosition, respawnDataPacket.playerID, 0, renderDepth, null, Game.tribe.tribeType, {itemSlots: {}, width: 1, height: 1, inventoryName: "armourSlot"}, {itemSlots: {}, width: 1, height: 1, inventoryName: "backpackSlot"}, {itemSlots: {}, width: 1, height: 1, inventoryName: "backpack"}, null, TribeMemberAction.none, -1, -99999, -1, null, TribeMemberAction.none, -1, -99999, -1, false, Game.tribe.tribeType === TribeType.goblins ? randInt(1, 5) : -1, definiteGameState.playerUsername);
      player.addCircularHitbox(Player.createNewPlayerHitbox());
      player.collisionBit = COLLISION_BITS.default;
      player.collisionMask = DEFAULT_COLLISION_MASK;
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

   public static sendInitialPlayerData(username: string, tribeType: TribeType): void {
      // Send player data to the server
      if (this.socket !== null) {
         this.socket.emit("initial_player_data", username, tribeType);
      }
   }

   public static sendVisibleChunkBounds(visibleChunks: VisibleChunkBounds): void {
      // Send player data to the server
      if (this.socket !== null) {
         this.socket.emit("visible_chunk_bounds", visibleChunks);
      }
   }

   public static sendPlayerDataPacket(): void {
      if (Game.isRunning && this.socket !== null && Player.instance !== null) {
         let interactingEntityID = -1;
         const selectedEntityID = getSelectedEntityID();
         if (Board.entityRecord.hasOwnProperty(selectedEntityID)) {
            const entity = Board.entityRecord[selectedEntityID];
            if (entity.type === EntityType.tribeWorker || entity.type === EntityType.tribeWarrior) {
               interactingEntityID = entity.id;
            }
         }
         
         const packet: PlayerDataPacket = {
            position: Player.instance.position.package(),
            velocity: Player.instance.velocity.package() || null,
            acceleration: Player.instance.acceleration.package() || null,
            rotation: Player.instance.rotation,
            visibleChunkBounds: Camera.getVisibleChunkBounds(),
            selectedItemSlot: latencyGameState.selectedHotbarItemSlot,
            mainAction: latencyGameState.mainAction,
            offhandAction: latencyGameState.offhandAction,
            interactingEntityID: interactingEntityID
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

   public static sendHeldItemDropPacket(dropAmount: number, dropDirection: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("held_item_drop", dropAmount, dropDirection);
      }
   }

   public static sendItemDropPacket(itemSlot: number, dropAmount: number, dropDirection: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_drop", itemSlot, dropAmount, dropDirection);
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
      Player.instance = null;

      latencyGameState.resetFlags();
      definiteGameState.resetFlags();

      gameScreenSetIsDead(true);
      updateInventoryIsOpen(false);
      closeTechTree();
   }

   public static sendSelectTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("select_tech", techID);
      }
   }

   public static sendUnlockTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("unlock_tech", techID);
      }
   }

   public static sendForceUnlockTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("force_unlock_tech", techID);
      }
   }

   public static sendStudyTech(studyAmount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("study_tech", studyAmount);
      }
   }

   public static sendShapeStructure(structureID: number, shapeType: BuildingShapeType): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("shape_structure", structureID, shapeType);
      }
   }

   public static sendStructureInteract(structureID: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("structure_interact", structureID);
      }
   }

   public static sendStructureUninteract(structureID: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("structure_uninteract", structureID);
      }
   }
}

export default Client;