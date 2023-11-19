import { AttackPacket, EntityType, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType, PlaceableItemType, Point, SETTINGS, STATUS_EFFECT_MODIFIERS, ToolItemInfo, TribeMemberAction } from "webgl-test-shared";
import { addKeyListener, clearPressedKeys, keyIsPressed } from "./keyboard-input";
import { CraftingMenu_setIsVisible } from "./components/game/menus/CraftingMenu";
import Player from "./entities/Player";
import Client from "./client/Client";
import { Hotbar_setHotbarSelectedItemSlot } from "./components/game/inventories/Hotbar";
import { InteractInventoryType, InteractInventory_clearInventory, InteractInventory_forceUpdate, InteractInventory_setInventory } from "./components/game/inventories/InteractInventory";
import { BackpackInventoryMenu_setIsVisible } from "./components/game/inventories/BackpackInventory";
import Entity from "./entities/Entity";
import Tribesman from "./entities/Tribesman";
import Tombstone from "./entities/Tombstone";
import Item from "./items/Item";
import Board from "./Board";
import { definiteGameState, latencyGameState } from "./game-state/game-states";
import Game from "./Game";
import { showChargeMeter } from "./components/game/ChargeMeter";
import Barrel from "./entities/Barrel";
import Campfire from "./entities/Campfire";
import Furnace from "./entities/Furnace";
import TribeHut from "./entities/TribeHut";
import TribeTotem from "./entities/TribeTotem";
import Workbench from "./entities/Workbench";
import CircularHitbox from "./hitboxes/CircularHitbox";
import Hitbox from "./hitboxes/Hitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";

/** Amount of seconds of forced delay on when an item can be used for attacking when switching between items */
const GLOBAL_ATTACK_DELAY_ON_SWITCH = 0.1;

/** Terminal velocity of the player while moving without any modifiers. */
const PLAYER_TERMINAL_VELOCITY = 300;

const PLAYER_LIGHTSPEED_TERMINAL_VELOCITY = 5000;

/** Acceleration of the player while moving without any modifiers. */
const PLAYER_ACCELERATION = 700;

const PLAYER_LIGHTSPEED_ACCELERATION = 15000;

/** Terminal velocity of the player while slowed. */
const PLAYER_SLOW_TERMINAL_VELOCITY = 100;
/** Acceleration of the player while slowed. */
const PLAYER_SLOW_ACCELERATION = 400;

const PLAYER_INTERACT_RANGE = 125;

enum PlaceableItemHitboxType {
   circular,
   rectangular
}

interface PlaceableEntityInfo {
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
         // The player can only place a tribe totem if they aren't in a tribe
         return Game.tribe === null;
      },
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.tribe_hut]: {
      textureSource: "tribe-hut/tribe-hut.png",
      width: TribeHut.SIZE,
      height: TribeHut.SIZE,
      placeOffset: TribeHut.SIZE / 2,
      canPlace: (): boolean => {
         // The player can't place huts if they aren't in a tribe
         if (Game.tribe === null) return false;

         return Game.tribe.numHuts < Game.tribe.tribesmanCap;
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
   }
};

const testRectangularHitbox = new RectangularHitbox(-1, -1);
const testCircularHitbox = new CircularHitbox(-1);

let globalAttackDelayTimer = 0;

const itemAttackCooldowns: Record<number, number> = {};

/** Whether the inventory is open or not. */
let _inventoryIsOpen = false;

let _interactInventoryIsOpen = false;
let interactInventoryEntity: Entity | null = null;

export function getInteractEntityID(): number | null {
   return interactInventoryEntity !== null ? interactInventoryEntity.id : null;
}

export function updatePlayerItems(): void {
   if (definiteGameState.hotbar === null) {
      return;
   }

   // @Cleanup: destroy this.
   if (Player.instance !== null) {
      if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         Player.instance.updateActiveItem(definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot].type);
         Player.instance.updateBowChargeTexture();
      } else {
         Player.instance.updateActiveItem(null);
      }
      Player.instance.updateHandDirections();

      Player.instance.updateArmourRenderPart(definiteGameState.armourSlot.itemSlots.hasOwnProperty(1) ? definiteGameState.armourSlot.itemSlots[1].type : null);

      Player.instance!.updateBowChargeTexture();
   }


   // Decrement global item switch delay
   globalAttackDelayTimer -= 1 / SETTINGS.TPS;
   if (globalAttackDelayTimer < 0) {
      globalAttackDelayTimer = 0;
   }

   // Decrement attack cooldown timers
   for (let itemSlot = 1; itemSlot <= definiteGameState.hotbar.width; itemSlot++) {
      if (itemAttackCooldowns.hasOwnProperty(itemSlot)) {
         itemAttackCooldowns[itemSlot] -= 1 / SETTINGS.TPS;
         if (itemAttackCooldowns[itemSlot] < 0) {
            delete itemAttackCooldowns[itemSlot];
         }
      }
   }

   // Tick items
   for (const [_itemSlot, item] of Object.entries(definiteGameState.hotbar.itemSlots)) {
      tickItem(item, Number(_itemSlot));
   }
}

const attack = (): void => {
   if (Player.instance === null) return;
      
   const attackPacket: AttackPacket = {
      itemSlot: latencyGameState.selectedHotbarItemSlot,
      attackDirection: Player.instance.rotation
   };
   Client.sendAttackPacket(attackPacket);

   if (latencyGameState.playerAction !== TribeMemberAction.charge_bow) {
      Player.instance.lastActionTicks = Board.ticks;
   }
}

export let rightMouseButtonIsPressed = false;
export let leftMouseButtonIsPressed = false;

const createItemUseListeners = (): void => {
   document.addEventListener("mousedown", e => {
      if (Player.instance === null || definiteGameState.hotbar === null || definiteGameState.playerIsDead()) return;

      // Only attempt to use an item if the game canvas was clicked
      if ((e.target as HTMLElement).id !== "game-canvas") {
         return;
      }

      const selectedItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
      if (e.button === 0) {
         // 
         // Left click
         // 
         
         leftMouseButtonIsPressed = true;

         if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
            // Attack with item
            if (!itemAttackCooldowns.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
               attack();

               // Reset the attack cooldown of the weapon
               const itemTypeInfo = ITEM_TYPE_RECORD[selectedItem.type];
               if (itemTypeInfo === "axe" || itemTypeInfo === "pickaxe" || itemTypeInfo === "sword") {
                  const itemInfo = ITEM_INFO_RECORD[selectedItem.type];
                  itemAttackCooldowns[latencyGameState.selectedHotbarItemSlot] = (itemInfo as ToolItemInfo).attackCooldown;
               } else {
                  itemAttackCooldowns[latencyGameState.selectedHotbarItemSlot] = SETTINGS.DEFAULT_ATTACK_COOLDOWN;
               }
            }
         } else {
            // Attack without item
            if (!itemAttackCooldowns.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
               attack();

               itemAttackCooldowns[latencyGameState.selectedHotbarItemSlot] = SETTINGS.DEFAULT_ATTACK_COOLDOWN;
            }
         }
      } else if (e.button === 2) {
         // 
         // Right click
         // 

         rightMouseButtonIsPressed = true;

         if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
            itemRightClickDown(selectedItem);
         }
      }
   });

   document.addEventListener("mouseup", e => {
      if (Player.instance === null || definiteGameState.hotbar === null || definiteGameState.playerIsDead()) return;

      // Only attempt to use an item if the game canvas was clicked
      if ((e.target as HTMLElement).id !== "game-canvas") {
         return;
      }

      if (!definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         return;
      }
      const selectedItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];

      if (e.button === 0) {
         leftMouseButtonIsPressed = false;
      } else if (e.button === 2) {
         rightMouseButtonIsPressed = false;

         itemRightClickUp(selectedItem);
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
            } else if (entity.type === EntityType.tribesman) {
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
      case EntityType.tribesman: {
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
      if (!Board.gameObjects.has(interactInventoryEntity)) {
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
      let terminalVelocity: number;
      if (keyIsPressed("l")) {
         acceleration = PLAYER_LIGHTSPEED_ACCELERATION;
         terminalVelocity = PLAYER_LIGHTSPEED_TERMINAL_VELOCITY;
      } else if (latencyGameState.playerAction === TribeMemberAction.eat || latencyGameState.playerAction === TribeMemberAction.charge_bow || latencyGameState.playerIsPlacingEntity) {
         acceleration = PLAYER_SLOW_ACCELERATION * getPlayerMoveSpeedMultiplier();
         terminalVelocity = PLAYER_SLOW_TERMINAL_VELOCITY * getPlayerMoveSpeedMultiplier();
      } else {
         acceleration = PLAYER_ACCELERATION * getPlayerMoveSpeedMultiplier()
         terminalVelocity = PLAYER_TERMINAL_VELOCITY * getPlayerMoveSpeedMultiplier()
      }
      Player.instance.acceleration.x = acceleration * Math.sin(moveDirection);
      Player.instance.acceleration.y = acceleration * Math.cos(moveDirection);
      Player.instance.terminalVelocity = terminalVelocity;
   } else {
      Player.instance.acceleration.x = 0;
      Player.instance.acceleration.y = 0;
   }
}

const deselectItem = (item: Item): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "bow": {
         latencyGameState.playerAction = TribeMemberAction.none;
         Player.instance!.action = TribeMemberAction.none;

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

export function canPlaceItem(item: Item): boolean {
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
      placeTestHitbox = testRectangularHitbox;
   }

   placeTestHitbox.offset = Point.fromVectorForm(SETTINGS.ITEM_PLACE_DISTANCE + placeableInfo.placeOffset, 0);
   placeTestHitbox.updateFromGameObject(Player.instance!);
   placeTestHitbox.updateHitboxBounds(Player.instance!.rotation);

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
   const tileHitbox = new RectangularHitbox(SETTINGS.TILE_SIZE, SETTINGS.TILE_SIZE);

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

const itemRightClickDown = (item: Item): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         if (definiteGameState.playerHealth < Player.MAX_HEALTH) {
            latencyGameState.playerAction = TribeMemberAction.eat;
            Player.instance!.action = TribeMemberAction.eat;
            Player.instance!.foodEatingType = item.type;
            Player.instance!.lastActionTicks = Board.ticks;
         }

         break;
      }
      case "bow": {
         latencyGameState.playerAction = TribeMemberAction.charge_bow;
         Player.instance!.action = TribeMemberAction.charge_bow;
         Player.instance!.lastActionTicks = Board.ticks;
         
         showChargeMeter();

         break;
      }
      case "armour": {
         Client.sendItemUsePacket();

         break;
      }
      case "placeable": {
         if (canPlaceItem(item)) {
            Client.sendItemUsePacket();
         }
         
         break;
      }
   }
}

const itemRightClickUp = (item: Item): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         latencyGameState.playerAction = TribeMemberAction.none;
         Player.instance!.action = TribeMemberAction.none;
         Player.instance!.foodEatingType = -1;

         break;
      }
      case "bow": {
         Client.sendItemUsePacket();
         latencyGameState.playerAction = TribeMemberAction.none;
         Player.instance!.action = TribeMemberAction.none;

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
      deselectItem(definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot]);
   }
   if (definiteGameState.hotbar.itemSlots.hasOwnProperty(itemSlot)) {
      selectItem(definiteGameState.hotbar.itemSlots[itemSlot]);
      if (rightMouseButtonIsPressed && ITEM_TYPE_RECORD[definiteGameState.hotbar.itemSlots[itemSlot].type] === "bow") {
         itemRightClickDown(definiteGameState.hotbar.itemSlots[itemSlot]);
      }
   }

   latencyGameState.selectedHotbarItemSlot = itemSlot;
   globalAttackDelayTimer = GLOBAL_ATTACK_DELAY_ON_SWITCH;
      
   Hotbar_setHotbarSelectedItemSlot(itemSlot);

   // @Cleanup: Shouldn't be here
   if (Player.instance !== null) {
      if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         Player.instance.updateActiveItem(definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot].type);
         Player.instance.updateBowChargeTexture();
      } else {
         Player.instance.updateActiveItem(null);
      }
   }
}

const tickItem = (item: Item, itemSlot: number): void => {
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         // If the player can no longer eat food without wasting it, stop eating
         if (itemSlot === latencyGameState.selectedHotbarItemSlot && latencyGameState.playerAction === TribeMemberAction.eat && definiteGameState.playerHealth >= Player.MAX_HEALTH) {
            latencyGameState.playerAction = TribeMemberAction.none;
            Player.instance!.action = TribeMemberAction.none;
            Player.instance!.foodEatingType = -1;
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
         latencyGameState.playerAction = TribeMemberAction.none;
         Player.instance.action = TribeMemberAction.none;
         Player.instance.foodEatingType = -1;

         break;
      }
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = false;
      }
   }
}