import { AttackPacket, EntityType, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, Inventory, Item, ItemType, PlaceableItemType, Point, SETTINGS, SNAP_OFFSETS, STATUS_EFFECT_MODIFIERS, StructureType, TRIBE_INFO_RECORD, ToolItemInfo, TribeMemberAction, TribeType, distance } from "webgl-test-shared";
import { addKeyListener, clearPressedKeys, keyIsPressed } from "./keyboard-input";
import { CraftingMenu_setIsVisible } from "./components/game/menus/CraftingMenu";
import Player from "./entities/Player";
import Client from "./client/Client";
import { Hotbar_setHotbarSelectedItemSlot, Hotbar_updateLeftThrownBattleaxeItemID, Hotbar_updateRightThrownBattleaxeItemID } from "./components/game/inventories/Hotbar";
import { InteractInventoryType, InteractInventory_clearInventory, InteractInventory_forceUpdate, InteractInventory_setInventory } from "./components/game/inventories/InteractInventory";
import { BackpackInventoryMenu_setIsVisible } from "./components/game/inventories/BackpackInventory";
import Entity from "./entities/Entity";
import Tribesman from "./entities/Tribesman";
import Tombstone from "./entities/Tombstone";
import Board from "./Board";
import { definiteGameState, latencyGameState } from "./game-state/game-states";
import Game from "./Game";
import { showChargeMeter } from "./components/game/ChargeMeter";
import Barrel from "./entities/Barrel";
import Campfire from "./entities/Campfire";
import Furnace from "./entities/Furnace";
import WorkerHut from "./entities/WorkerHut";
import TribeTotem from "./entities/TribeTotem";
import Workbench from "./entities/Workbench";
import CircularHitbox from "./hitboxes/CircularHitbox";
import Hitbox from "./hitboxes/Hitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import { closeTechTree, techTreeIsOpen } from "./components/game/TechTree";
import WarriorHut from "./entities/WarriorHut";
import GameObject from "./GameObject";
import { attemptStructureSelect } from "./structure-selection";
import { serialiseItem } from "./inventory-manipulation";

/** Acceleration of the player while moving without any modifiers. */
const PLAYER_ACCELERATION = 700;

const PLAYER_LIGHTSPEED_ACCELERATION = 15000;

/** Acceleration of the player while slowed. */
const PLAYER_SLOW_ACCELERATION = 400;

const PLAYER_INTERACT_RANGE = 125;

export let rightMouseButtonIsPressed = false;
export let leftMouseButtonIsPressed = false;

enum PlaceableItemHitboxType {
   circular,
   rectangular
}

export interface PlaceableEntityInfo {
   readonly textureSource: string;
   readonly width: number;
   readonly height: number;
   readonly placeOffset: number;
   readonly hitboxType: PlaceableItemHitboxType;
   /** Optionally defines extra criteria for being placed */
   canPlace?(): boolean;
}

export const PLACEABLE_ENTITY_INFO_RECORD: Record<PlaceableItemType, PlaceableEntityInfo> = {
   [ItemType.workbench]: {
      textureSource: "workbench/workbench.png",
      width: Workbench.SIZE,
      height: Workbench.SIZE,
      placeOffset: Workbench.SIZE / 2,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.tribe_totem]: {
      textureSource: "tribe-totem/tribe-totem.png",
      width: TribeTotem.SIZE,
      height: TribeTotem.SIZE,
      placeOffset: TribeTotem.SIZE / 2,
      canPlace: (): boolean => {
         // The player can only place one tribe totem
         return !Game.tribe.hasTotem;
      },
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.worker_hut]: {
      textureSource: "worker-hut/worker-hut.png",
      width: WorkerHut.SIZE,
      height: WorkerHut.SIZE,
      placeOffset: WorkerHut.SIZE / 2,
      canPlace: (): boolean => {
         return Game.tribe.hasTotem && Game.tribe.numHuts < Game.tribe.tribesmanCap;
      },
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.warrior_hut]: {
      textureSource: "warrior-hut/warrior-hut.png",
      width: WarriorHut.SIZE,
      height: WarriorHut.SIZE,
      placeOffset: WarriorHut.SIZE / 2,
      canPlace: (): boolean => {
         return Game.tribe.hasTotem && Game.tribe.numHuts < Game.tribe.tribesmanCap;
      },
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.barrel]: {
      textureSource: "barrel/barrel.png",
      width: Barrel.SIZE,
      height: Barrel.SIZE,
      placeOffset: Barrel.SIZE / 2,
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.campfire]: {
      textureSource: "campfire/campfire.png",
      width: Campfire.SIZE,
      height: Campfire.SIZE,
      placeOffset: Campfire.SIZE / 2,
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.furnace]: {
      textureSource: "furnace/furnace.png",
      width: Furnace.SIZE,
      height: Furnace.SIZE,
      placeOffset: Furnace.SIZE / 2,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.research_bench]: {
      textureSource: "research-bench/research-bench.png",
      width: 32 * 4,
      height: 20 * 4,
      placeOffset: 50,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.wooden_wall]: {
      textureSource: "wooden-wall/wooden-wall.png",
      width: 64,
      height: 64,
      placeOffset: 32,
      hitboxType: PlaceableItemHitboxType.rectangular
   }
};

const testRectangularHitbox = new RectangularHitbox(-1, -1, 0);
const testCircularHitbox = new CircularHitbox(-1, 0);

const hotbarItemAttackCooldowns: Record<number, number> = {};
const offhandItemAttackCooldowns: Record<number, number> = {};

/** Whether the inventory is open or not. */
let _inventoryIsOpen = false;

let _interactInventoryIsOpen = false;
let interactInventoryEntity: Entity | null = null;

export function getInteractEntityID(): number | null {
   return interactInventoryEntity !== null ? interactInventoryEntity.id : null;
}

const updateAttackCooldowns = (inventory: Inventory, attackCooldowns: Record<number, number>): void => {
   for (let itemSlot = 1; itemSlot <= inventory.width; itemSlot++) {
      if (attackCooldowns.hasOwnProperty(itemSlot)) {
         attackCooldowns[itemSlot] -= 1 / SETTINGS.TPS;
         if (attackCooldowns[itemSlot] < 0) {
            delete attackCooldowns[itemSlot];
         }
      }
   }
}

export function updatePlayerItems(): void {
   if (definiteGameState.hotbar === null) {
      return;
   }

   // @Cleanup: destroy this.
   if (Player.instance !== null) {
      if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         Player.instance.rightActiveItem = serialiseItem(definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot]);
         Player.instance.updateBowChargeTexture();
      } else {
         Player.instance.rightActiveItem = null;
      }
      if (definiteGameState.offhandInventory.itemSlots.hasOwnProperty(1)) {
         Player.instance.leftActiveItem = serialiseItem(definiteGameState.offhandInventory.itemSlots[1]);
      } else {
         Player.instance.leftActiveItem = null;
      }
      Player.instance.updateHands();

      Player.instance.updateArmourRenderPart(definiteGameState.armourSlot.itemSlots.hasOwnProperty(1) ? definiteGameState.armourSlot.itemSlots[1].type : null);

      Player.instance!.updateBowChargeTexture();
   }

   updateAttackCooldowns(definiteGameState.hotbar, hotbarItemAttackCooldowns);
   updateAttackCooldowns(definiteGameState.offhandInventory, offhandItemAttackCooldowns);

   // Tick items
   for (const [_itemSlot, item] of Object.entries(definiteGameState.hotbar.itemSlots)) {
      tickItem(item, Number(_itemSlot));
   }
}

const attack = (isOffhand: boolean): void => {
   const attackPacket: AttackPacket = {
      itemSlot: latencyGameState.selectedHotbarItemSlot,
      attackDirection: Player.instance!.rotation
   };
   Client.sendAttackPacket(attackPacket);

   // Update bow charge cooldown
   if (latencyGameState.mainAction !== TribeMemberAction.chargeBow) {
      if (isOffhand) {
         Player.instance!.leftLastActionTicks = Board.ticks;
      } else {
         Player.instance!.rightLastActionTicks = Board.ticks;
      }
   }
}

const attemptInventoryAttack = (inventory: Inventory): boolean => {
   const isOffhand = inventory.inventoryName !== "hotbar";
   const attackCooldowns = isOffhand ? offhandItemAttackCooldowns : hotbarItemAttackCooldowns;
   const selectedItemSlot = isOffhand ? 1 : latencyGameState.selectedHotbarItemSlot;

   // Don't attack if the hand is busy waiting for a battleaxe to return
   const thrownBattleaxeItemID = isOffhand ? Player.instance!.leftThrownBattleaxeItemID : Player.instance!.rightThrownBattleaxeItemID;
   const selectedItem = inventory.itemSlots[selectedItemSlot];
   if (thrownBattleaxeItemID !== -1 && thrownBattleaxeItemID === selectedItem.id) {
      return false;
   }
   
   if (inventory.itemSlots.hasOwnProperty(selectedItemSlot)) {
      // Attack with item
      if (!attackCooldowns.hasOwnProperty(selectedItemSlot)) {
         attack(isOffhand);
         
         // Reset the attack cooldown of the weapon
         const itemTypeInfo = ITEM_TYPE_RECORD[selectedItem.type];
         if (itemTypeInfo === "axe" || itemTypeInfo === "pickaxe" || itemTypeInfo === "sword" || itemTypeInfo === "spear" || itemTypeInfo === "hammer" || itemTypeInfo === "battleaxe") {
            const itemInfo = ITEM_INFO_RECORD[selectedItem.type];
            attackCooldowns[selectedItemSlot] = (itemInfo as ToolItemInfo).attackCooldown;
         } else {
            attackCooldowns[selectedItemSlot] = SETTINGS.DEFAULT_ATTACK_COOLDOWN;
         }

         return true;
      }
   } else {
      // Attack without item
      if (!attackCooldowns.hasOwnProperty(selectedItemSlot)) {
         attack(isOffhand);
         attackCooldowns[selectedItemSlot] = SETTINGS.DEFAULT_ATTACK_COOLDOWN;

         return true;
      }
   }

   return false;
}

const attemptAttack = (): void => {
   if (Player.instance === null) return;

   const hotbarAttackDidSucceed = attemptInventoryAttack(definiteGameState.hotbar);
   if (!hotbarAttackDidSucceed && Game.tribe.tribeType === TribeType.barbarians) {
      attemptInventoryAttack(definiteGameState.offhandInventory);
   }
}

interface SelectedItemInfo {
   readonly item: Item;
   readonly isOffhand: boolean;
}

const getSelectedItemInfo = (): SelectedItemInfo | null => {
   if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
      const item = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
      return {
         item: item,
         isOffhand: false
      };
   }

   if (definiteGameState.offhandInventory.itemSlots.hasOwnProperty(1)) {
      const item = definiteGameState.offhandInventory.itemSlots[1];
      return {
         item: item,
         isOffhand: true
      };
   }

   return null;
}

const createItemUseListeners = (): void => {
   document.addEventListener("mousedown", e => {
      if (Player.instance === null || definiteGameState.hotbar === null || definiteGameState.playerIsDead()) return;

      // Only attempt to use an item if the game canvas was clicked
      if ((e.target as HTMLElement).id !== "game-canvas") {
         return;
      }

      if (e.button === 0) { // Left click
         leftMouseButtonIsPressed = true;
         attemptAttack();
      } else if (e.button === 2) { // Right click
         rightMouseButtonIsPressed = true;

         const selectedItemInfo = getSelectedItemInfo();
         if (selectedItemInfo !== null) {
            itemRightClickDown(selectedItemInfo.item, selectedItemInfo.isOffhand);
         }
         
         attemptStructureSelect();
      }
   });

   document.addEventListener("mouseup", e => {
      if (Player.instance === null || definiteGameState.hotbar === null || definiteGameState.playerIsDead()) return;

      // Only attempt to use an item if the game canvas was clicked
      if ((e.target as HTMLElement).id !== "game-canvas") {
         return;
      }

      if (e.button === 0) { // Left click
         leftMouseButtonIsPressed = false;
      } else if (e.button === 2) { // Right click
         rightMouseButtonIsPressed = false;

         const selectedItemInfo = getSelectedItemInfo();
         if (selectedItemInfo !== null) {
            itemRightClickUp(selectedItemInfo.item, selectedItemInfo.isOffhand);
         }
      }
   });

   // Stop the context menu from appearing
   document.addEventListener("contextmenu", e => {
      for (const element of e.composedPath()) {
         if ((element as HTMLElement).id === "hotbar") {
            e.preventDefault();
            return;
         }
      }
      
      if ((e.target as HTMLElement).id === "game-canvas") {
         e.preventDefault();
         return;
      }

      // When the context menu is opened, stop player movement
      clearPressedKeys();
   });
}

const createHotbarKeyListeners = (): void => {
   for (let itemSlot = 1; itemSlot <= SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE; itemSlot++) {
      addKeyListener(itemSlot.toString(), () => selectItemSlot(itemSlot));
   }
}

const throwHeldItem = (): void => {
   if (Player.instance !== null) {
      Client.sendHeldItemDropPacket(99999, Player.instance.rotation);
   }
}

export function updateInventoryIsOpen(inventoryIsOpen: boolean): void {
   _inventoryIsOpen = inventoryIsOpen;
   
   CraftingMenu_setIsVisible(_inventoryIsOpen);
   BackpackInventoryMenu_setIsVisible(_inventoryIsOpen);

   // If the player is holding an item when their inventory is closed, throw the item out
   if (!_inventoryIsOpen && definiteGameState.heldItemSlot !== null) {
      throwHeldItem();
   }
}

const getInteractEntity = (): Entity | null => {
   if (Player.instance === null) return null;

   const minChunkX = Math.max(Math.min(Math.floor((Player.instance.position.x - PLAYER_INTERACT_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((Player.instance.position.x + PLAYER_INTERACT_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((Player.instance.position.y - PLAYER_INTERACT_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((Player.instance.position.y + PLAYER_INTERACT_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1), 0);
   
   let minInteractionDistance = PLAYER_INTERACT_RANGE + Number.EPSILON;
   let closestInteractableEntity: Entity | null = null;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getEntities()) {
            if (entity.type === EntityType.barrel) {
               const distance = Player.instance.position.calculateDistanceBetween(entity.position);
               if (distance < minInteractionDistance) {
                  closestInteractableEntity = entity;
                  minInteractionDistance = distance;
               }
            } else if (entity.type === EntityType.tribeWorker || entity.type === EntityType.tribeWarrior) {
               // Only interact with tribesman inventories if the player is of the same tribe
               if ((entity as Tribesman).tribeID === null || ((entity as Tribesman).tribeID) !== Player.instance.tribeID) {
                  continue;
               }
               
               const distance = Player.instance.position.calculateDistanceBetween(entity.position);
               if (distance < minInteractionDistance) {
                  closestInteractableEntity = entity;
                  minInteractionDistance = distance;
               }
            } else if (entity.type === EntityType.campfire) {
               const distance = Player.instance.position.calculateDistanceBetween(entity.position);
               if (distance < minInteractionDistance) {
                  closestInteractableEntity = entity;
                  minInteractionDistance = distance;
               }
            } else if (entity.type === EntityType.furnace) {
               const distance = Player.instance.position.calculateDistanceBetween(entity.position);
               if (distance < minInteractionDistance) {
                  closestInteractableEntity = entity;
                  minInteractionDistance = distance;
               }
            } else if (entity.type === EntityType.tombstone) {
               if ((entity as Tombstone).deathInfo === null) {
                  continue;
               }

               const distance = Player.instance.position.calculateDistanceBetween(entity.position);
               if (distance < minInteractionDistance) {
                  closestInteractableEntity = entity;
                  minInteractionDistance = distance;
               }
            }
         }
      }
   }

   return closestInteractableEntity;
}

const getInteractInventoryType = (entity: Entity): InteractInventoryType => {
   switch (entity.type) {
      case EntityType.barrel: {
         return InteractInventoryType.barrel;
      }
      case EntityType.tribeWarrior:
      case EntityType.tribeWorker: {
         return InteractInventoryType.tribesman;
      }
      case EntityType.campfire: {
         return InteractInventoryType.campfire;
      }
      case EntityType.furnace: {
         return InteractInventoryType.furnace;
      }
      case EntityType.tombstone: {
         return InteractInventoryType.tombstoneEpitaph;
      }
      default: {
         throw new Error(`Can't find appropriate interact inventory type for entity type'${entity.type}'.`);
      }
   }
}

export function hideInteractInventory(): void {
   _interactInventoryIsOpen = false;
   interactInventoryEntity = null;

   InteractInventory_clearInventory();
}

export function updateInteractInventory(): void {
   if (Player.instance === null) return;
   
   if (_interactInventoryIsOpen) {
      if (interactInventoryEntity === null) {
         throw new Error("Interactable entity was null.");
      }

      // If the interactable entity was removed, hide the interact inventory
      if (!Board.entities.has(interactInventoryEntity)) {
         hideInteractInventory();
         return;
      }

      const distanceToInteractEntity = Player.instance.position.calculateDistanceBetween(interactInventoryEntity.position);
      if (distanceToInteractEntity <= PLAYER_INTERACT_RANGE) {
         InteractInventory_forceUpdate();
      } else {
         hideInteractInventory();
      }
   }
}

/** Creates the key listener to toggle the inventory on and off. */
const createInventoryToggleListeners = (): void => {
   addKeyListener("e", () => {
      if (!Game.isRunning) {
         return;
      }
      
      if (_interactInventoryIsOpen) {
         hideInteractInventory();
         return;
      }

      updateInventoryIsOpen(!_inventoryIsOpen);
   });

   addKeyListener("i", () => {
      if (_inventoryIsOpen) {
         updateInventoryIsOpen(false);
         return;
      }
      
      if (_interactInventoryIsOpen) {
         hideInteractInventory();
      } else {
         const interactEntity = getInteractEntity();
         if (interactEntity !== null) {
            interactInventoryEntity = interactEntity;
            const interactInventoryType = getInteractInventoryType(interactInventoryEntity);
            _interactInventoryIsOpen = true;
            InteractInventory_setInventory(interactInventoryType, interactInventoryEntity);
         }
      }
   });
   addKeyListener("escape", () => {
      if (techTreeIsOpen()) {
         closeTechTree();
         return;
      }

      if (_inventoryIsOpen) {
         updateInventoryIsOpen(false);
      };
   });
}

/** Creates keyboard and mouse listeners for the player. */
export function createPlayerInputListeners(): void {
   createItemUseListeners();
   createHotbarKeyListeners();
   createInventoryToggleListeners();

   document.body.addEventListener("wheel", e => {
      const scrollDirection = Math.sign(e.deltaY);
      let newSlot = latencyGameState.selectedHotbarItemSlot + scrollDirection;
      if (newSlot <= 0) {
         newSlot += SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE;
      } else if (newSlot > SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE) {
         newSlot -= SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE;
      }
      selectItemSlot(newSlot);
   });

   addKeyListener("q", () => {
      if (Player.instance !== null) {
         const dropAmount = keyIsPressed("shift") ? 99999 : 1;
         Client.sendItemDropPacket(latencyGameState.selectedHotbarItemSlot, dropAmount, Player.instance.rotation);
      }
   });
}

const getPlayerMoveSpeedMultiplier = (): number => {
   let moveSpeedMultiplier = 1;

   for (const statusEffect of Player.instance!.statusEffects) {
      moveSpeedMultiplier *= STATUS_EFFECT_MODIFIERS[statusEffect.type].moveSpeedMultiplier;
   }

   moveSpeedMultiplier *= TRIBE_INFO_RECORD[Game.tribe.tribeType].moveSpeedMultiplier;

   return moveSpeedMultiplier;
}

/** Updates the player's movement to match what keys are being pressed. */
export function updatePlayerMovement(): void {
   // Don't update movement if the player doesn't exist
   if (Player.instance === null) return;
   
   // Get pressed keys
   const wIsPressed = keyIsPressed("w") || keyIsPressed("W") || keyIsPressed("ArrowUp");
   const aIsPressed = keyIsPressed("a") || keyIsPressed("A") || keyIsPressed("ArrowLeft");
   const sIsPressed = keyIsPressed("s") || keyIsPressed("S") || keyIsPressed("ArrowDown");
   const dIsPressed = keyIsPressed("d") || keyIsPressed("D") || keyIsPressed("ArrowRight");

   const hash = (wIsPressed ? 1 : 0) + (aIsPressed ? 2 : 0) + (sIsPressed ? 4 : 0) + (dIsPressed ? 8 : 0);

   // Update rotation
   let moveDirection!: number | null;
   switch (hash) {
      case 0:  moveDirection = null;          break;
      case 1:  moveDirection = 0;   break;
      case 2:  moveDirection = Math.PI * 3/2;       break;
      case 3:  moveDirection = Math.PI * 7/4; break;
      case 4:  moveDirection = Math.PI; break;
      case 5:  moveDirection = null;          break;
      case 6:  moveDirection = Math.PI * 5/4; break;
      case 7:  moveDirection = Math.PI * 3/2;     break;
      case 8:  moveDirection = Math.PI/2;             break;
      case 9:  moveDirection = Math.PI / 4;   break;
      case 10: moveDirection = null;          break;
      case 11: moveDirection = 0;   break;
      case 12: moveDirection = Math.PI * 3/4; break;
      case 13: moveDirection = Math.PI/2;             break;
      case 14: moveDirection = Math.PI; break;
      case 15: moveDirection = null;          break;
   }

   if (moveDirection !== null) {
      let acceleration: number;
      if (keyIsPressed("l")) {
         acceleration = PLAYER_LIGHTSPEED_ACCELERATION;
      } else if (latencyGameState.mainAction === TribeMemberAction.eat || latencyGameState.mainAction === TribeMemberAction.chargeBow || latencyGameState.playerIsPlacingEntity) {
         acceleration = PLAYER_SLOW_ACCELERATION * getPlayerMoveSpeedMultiplier();
      } else {
         acceleration = PLAYER_ACCELERATION * getPlayerMoveSpeedMultiplier();
      }
      Player.instance.acceleration.x = acceleration * Math.sin(moveDirection);
      Player.instance.acceleration.y = acceleration * Math.cos(moveDirection);
   } else {
      Player.instance.acceleration.x = 0;
      Player.instance.acceleration.y = 0;
   }
}

const deselectItem = (item: Item, isOffhand: boolean): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "spear":
      case "battleaxe":
      case "bow": {
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.none;
            Player.instance!.leftAction = TribeMemberAction.none;
         } else {
            latencyGameState.mainAction = TribeMemberAction.none;
            Player.instance!.rightAction = TribeMemberAction.none;
         }
         break;
      }
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = false;
         break;
      }
   }
}

export function selectItem(item: Item): void {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = true;
         break;
      }
   }
}

const calculateRegularPlacePosition = (placeableEntityInfo: PlaceableEntityInfo): Point => {
   const placePositionX = Player.instance!.position.x + (SETTINGS.ITEM_PLACE_DISTANCE + placeableEntityInfo.placeOffset) * Math.sin(Player.instance!.rotation);
   const placePositionY = Player.instance!.position.y + (SETTINGS.ITEM_PLACE_DISTANCE + placeableEntityInfo.placeOffset) * Math.cos(Player.instance!.rotation);
   return new Point(placePositionX, placePositionY);
}

interface BuildingSnapInfo {
   /** -1 if no snap was found */
   readonly x: number;
   readonly y: number;
   readonly direction: number;
}
export function calculateSnapID(placeableEntityInfo: PlaceableEntityInfo): BuildingSnapInfo {
   const regularPlacePosition = calculateRegularPlacePosition(placeableEntityInfo);

   const minChunkX = Math.max(Math.floor((regularPlacePosition.x - SETTINGS.STRUCTURE_SNAP_RANGE) / SETTINGS.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((regularPlacePosition.x + SETTINGS.STRUCTURE_SNAP_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((regularPlacePosition.y - SETTINGS.STRUCTURE_SNAP_RANGE) / SETTINGS.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((regularPlacePosition.y + SETTINGS.STRUCTURE_SNAP_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1);
   
   const snappableEntities = new Array<GameObject>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getGameObjects()) {
            const distance = regularPlacePosition.calculateDistanceBetween(entity.position);
            if (distance > SETTINGS.STRUCTURE_SNAP_RANGE) {
               continue;
            }
            
            if (entity.type === EntityType.woodenWall) {
               snappableEntities.push(entity);
            }
         }
      }
   }

   for (const entity of snappableEntities) {
      const snapOffset = SNAP_OFFSETS[entity.type as StructureType];
      // Check the 4 potential snap positions for matches
      for (let i = 0; i < 4; i++) {
         const direction = i * Math.PI / 2;
         const placeDirection = (entity.rotation + direction + Math.PI) % (Math.PI * 2) - Math.PI;
         const x = entity.position.x + snapOffset * Math.sin(placeDirection);
         const y = entity.position.y + snapOffset * Math.cos(placeDirection);
         
         if (distance(regularPlacePosition.x, regularPlacePosition.y, x, y) > SETTINGS.STRUCTURE_POSITION_SNAP) {
            continue;
         }

         const playerRotation = (Player.instance!.rotation + Math.PI) % (Math.PI * 2) - Math.PI;
         for (let i = 0; i < 4; i++) {
            const direction = i * Math.PI / 2;
            const placeDirection = (entity.rotation + direction + Math.PI) % (Math.PI * 2) - Math.PI;
            let angleDiff = playerRotation - placeDirection;
            angleDiff = (angleDiff + Math.PI) % (Math.PI * 2) - Math.PI;
            if (Math.abs(angleDiff) <= SETTINGS.STRUCTURE_ROTATION_SNAP) {
               return {
                  x: x,
                  y: y,
                  direction: placeDirection
               };
            }
         }
      }
   }
   
   return {
      x: -1,
      y: -1,
      direction: -1
   };
}

export function calculatePlacePosition(placeableEntityInfo: PlaceableEntityInfo, snapInfo: BuildingSnapInfo): Point {
   if (snapInfo.x === -1) {
      return calculateRegularPlacePosition(placeableEntityInfo);
   }

   return new Point(snapInfo.x, snapInfo.y);
}

export function calculatePlaceRotation(snapInfo: BuildingSnapInfo): number {
   if (snapInfo.x === -1) {
      return Player.instance!.rotation;
   }

   return snapInfo.direction;
}

export function canPlaceItem(placePosition: Point, placeRotation: number, item: Item): boolean {
   if (!PLACEABLE_ENTITY_INFO_RECORD.hasOwnProperty(item.type)) {
      throw new Error(`Item type '${item.type}' is not placeable.`);
   }
   
   // Check for any special conditions
   const placeableInfo = PLACEABLE_ENTITY_INFO_RECORD[item.type as PlaceableItemType];
   if (typeof placeableInfo.canPlace !== "undefined" && !placeableInfo.canPlace()) {
      return false;
   }

   let placeTestHitbox: Hitbox;
   if (placeableInfo.hitboxType === PlaceableItemHitboxType.circular) {
      testCircularHitbox.radius = placeableInfo.width / 2; // For a circular hitbox, width and height will be the same
      placeTestHitbox = testCircularHitbox;
   } else {
      testRectangularHitbox.width = placeableInfo.width;
      testRectangularHitbox.height = placeableInfo.height;
      testRectangularHitbox.recalculateHalfDiagonalLength();
      testRectangularHitbox.rotation = placeRotation + Math.PI * 3/2;
      testRectangularHitbox.externalRotation = 0;
      placeTestHitbox = testRectangularHitbox;
   }
   
   placeTestHitbox.offset.x = 0;
   placeTestHitbox.offset.y = 0;
   placeTestHitbox.position.x = placePosition.x;
   placeTestHitbox.position.y = placePosition.y;
   placeTestHitbox.updateHitboxBounds(0);

   // Don't allow placing buildings in borders
   if (placeTestHitbox.bounds[0] < 0 || placeTestHitbox.bounds[1] >= SETTINGS.BOARD_UNITS || placeTestHitbox.bounds[2] < 0 || placeTestHitbox.bounds[3] >= SETTINGS.BOARD_UNITS) {
      return false;
   }

   // 
   // Check for entity collisions
   // 

   const minChunkX = Math.floor(placeTestHitbox.bounds[0] / SETTINGS.CHUNK_UNITS);
   const maxChunkX = Math.floor(placeTestHitbox.bounds[1] / SETTINGS.CHUNK_UNITS);
   const minChunkY = Math.floor(placeTestHitbox.bounds[2] / SETTINGS.CHUNK_UNITS);
   const maxChunkY = Math.floor(placeTestHitbox.bounds[3] / SETTINGS.CHUNK_UNITS);
   
   const previouslyCheckedEntityIDs = new Set<number>();

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getEntities()) {
            if (!previouslyCheckedEntityIDs.has(entity.id)) {
               for (const hitbox of entity.hitboxes) {   
                  if (placeTestHitbox.isColliding(hitbox)) {
                     return false;
                  }
               }
               
               previouslyCheckedEntityIDs.add(entity.id);
            }
         }
      }
   }

   // 
   // Check for wall tile collisions
   // 

   // @Speed: Garbage collection
   const tileHitbox = new RectangularHitbox(SETTINGS.TILE_SIZE, SETTINGS.TILE_SIZE, 0);

   const minTileX = Math.floor(placeTestHitbox.bounds[0] / SETTINGS.TILE_SIZE);
   const maxTileX = Math.floor(placeTestHitbox.bounds[1] / SETTINGS.TILE_SIZE);
   const minTileY = Math.floor(placeTestHitbox.bounds[2] / SETTINGS.TILE_SIZE);
   const maxTileY = Math.floor(placeTestHitbox.bounds[3] / SETTINGS.TILE_SIZE);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (!tile.isWall) {
            continue;
         }

         tileHitbox.position.x = (tileX + 0.5) * SETTINGS.TILE_SIZE;
         tileHitbox.position.y = (tileY + 0.5) * SETTINGS.TILE_SIZE;
         tileHitbox.updateHitboxBounds(0);

         if (placeTestHitbox.isColliding(tileHitbox)) {
            return false;
         }
      }
   }

   return true;
}

const itemRightClickDown = (item: Item, isOffhand: boolean): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         const maxHealth = TRIBE_INFO_RECORD[Player.instance!.tribeType].maxHealthPlayer;
         if (definiteGameState.playerHealth < maxHealth) {
            if (isOffhand) {
               latencyGameState.offhandAction = TribeMemberAction.eat;
               Player.instance!.leftAction = TribeMemberAction.eat;
               Player.instance!.leftFoodEatingType = item.type;
               Player.instance!.leftLastActionTicks = Board.ticks;
            } else {
               latencyGameState.mainAction = TribeMemberAction.eat;
               Player.instance!.rightAction = TribeMemberAction.eat;
               Player.instance!.rightFoodEatingType = item.type;
               Player.instance!.rightLastActionTicks = Board.ticks;
            }
         }

         break;
      }
      case "bow": {
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.chargeBow;
            Player.instance!.leftAction = TribeMemberAction.chargeBow;
            Player.instance!.leftLastActionTicks = Board.ticks;
         } else {
            latencyGameState.mainAction = TribeMemberAction.chargeBow;
            Player.instance!.rightAction = TribeMemberAction.chargeBow;
            Player.instance!.rightLastActionTicks = Board.ticks;
         }
         
         showChargeMeter();

         break;
      }
      case "spear": {
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.chargeSpear;
            Player.instance!.leftAction = TribeMemberAction.chargeSpear;
            Player.instance!.leftLastActionTicks = Board.ticks;
         } else {
            latencyGameState.mainAction = TribeMemberAction.chargeSpear;
            Player.instance!.rightAction = TribeMemberAction.chargeSpear;
            Player.instance!.rightLastActionTicks = Board.ticks;
         }
         break;
      }
      case "battleaxe": {
         if (isOffhand) {
            // If an axe is already thrown, don't throw another
            if (Player.instance!.leftThrownBattleaxeItemID !== -1) {
               break;
            }
            latencyGameState.offhandAction = TribeMemberAction.chargeBattleaxe;
            Player.instance!.leftAction = TribeMemberAction.chargeBattleaxe;
            Player.instance!.leftLastActionTicks = Board.ticks;
         } else {
            // If an axe is already thrown, don't throw another
            if (Player.instance!.rightThrownBattleaxeItemID !== -1) {
               break;
            }
            latencyGameState.mainAction = TribeMemberAction.chargeBattleaxe;
            Player.instance!.rightAction = TribeMemberAction.chargeBattleaxe;
            Player.instance!.rightLastActionTicks = Board.ticks;
         }
         break;
      }
      case "armour": {
         Client.sendItemUsePacket();

         break;
      }
      case "placeable": {
         const placeableEntityInfo = PLACEABLE_ENTITY_INFO_RECORD[item.type as PlaceableItemType]!;
         const snapID = calculateSnapID(placeableEntityInfo);
         const placePosition = calculatePlacePosition(placeableEntityInfo, snapID);
         const placeRotation = calculatePlaceRotation(snapID);
         if (canPlaceItem(placePosition, placeRotation, item)) {
            Client.sendItemUsePacket();
         }
         
         break;
      }
   }
}

const itemRightClickUp = (item: Item, isOffhand: boolean): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.none;
            Player.instance!.leftAction = TribeMemberAction.none;
            Player.instance!.leftFoodEatingType = -1;
         } else {
            latencyGameState.mainAction = TribeMemberAction.none;
            Player.instance!.rightAction = TribeMemberAction.none;
            Player.instance!.rightFoodEatingType = -1;
         }

         break;
      }
      case "battleaxe":
      case "spear":
      case "bow": {
         if (itemCategory === "battleaxe") {
            if (isOffhand) {
               // If an axe is already thrown, don't throw another
               if (Player.instance!.leftThrownBattleaxeItemID !== -1) {
                  break;
               }
               Player.instance!.leftThrownBattleaxeItemID = item.id;
               Hotbar_updateLeftThrownBattleaxeItemID(item.id);
            } else {
               // If an axe is already thrown, don't throw another
               if (Player.instance!.rightThrownBattleaxeItemID !== -1) {
                  break;
               }
               Player.instance!.rightThrownBattleaxeItemID = item.id;
               Hotbar_updateRightThrownBattleaxeItemID(item.id);
            }
         }

         Client.sendItemUsePacket();
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.none;
            Player.instance!.leftAction = TribeMemberAction.none;
         } else {
            latencyGameState.mainAction = TribeMemberAction.none;
            Player.instance!.rightAction = TribeMemberAction.none;
         }

         break;
      }
   }
}

const selectItemSlot = (itemSlot: number): void => {
   if (definiteGameState.hotbar === null || itemSlot === latencyGameState.selectedHotbarItemSlot) {
      return;
   }

   // Deselect the previous item and select the new item
   if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
      deselectItem(definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot], false);
   }
   if (definiteGameState.hotbar.itemSlots.hasOwnProperty(itemSlot)) {
      selectItem(definiteGameState.hotbar.itemSlots[itemSlot]);
      if (rightMouseButtonIsPressed && ITEM_TYPE_RECORD[definiteGameState.hotbar.itemSlots[itemSlot].type] === "bow") {
         itemRightClickDown(definiteGameState.hotbar.itemSlots[itemSlot], false);
      }
   }

   latencyGameState.selectedHotbarItemSlot = itemSlot;
      
   Hotbar_setHotbarSelectedItemSlot(itemSlot);

   // @Cleanup: Copy and paste, and shouldn't be here
   if (Player.instance !== null) {
      if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         Player.instance.rightActiveItem = serialiseItem(definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot]);
         Player.instance.updateBowChargeTexture();
      } else {
         Player.instance.rightActiveItem = null;
      }
      if (definiteGameState.offhandInventory.itemSlots.hasOwnProperty(1)) {
         Player.instance.leftActiveItem = serialiseItem(definiteGameState.offhandInventory.itemSlots[1]);
      } else {
         Player.instance.leftActiveItem = null;
      }
      // @Incomplete?? might want to call updateHands
   }
}

const tickItem = (item: Item, itemSlot: number): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         // If the player can no longer eat food without wasting it, stop eating
         const maxHealth = TRIBE_INFO_RECORD[Player.instance!.tribeType].maxHealthPlayer;
         if (itemSlot === latencyGameState.selectedHotbarItemSlot && latencyGameState.mainAction === TribeMemberAction.eat && definiteGameState.playerHealth >= maxHealth) {
            latencyGameState.mainAction = TribeMemberAction.none;
            Player.instance!.rightAction = TribeMemberAction.none;
            Player.instance!.rightFoodEatingType = -1;
         }

         break;
      }
   }
}

export function removeSelectedItem(item: Item): void {
   if (Player.instance === null) {
      return;
   }

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         latencyGameState.mainAction = TribeMemberAction.none;
         Player.instance.rightAction = TribeMemberAction.none;
         Player.instance.rightFoodEatingType = -1;

         break;
      }
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = false;
      }
   }
}