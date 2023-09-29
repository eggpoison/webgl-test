import { AttackPacket, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType, PlaceableItemType, Point, SETTINGS, STATUS_EFFECT_MODIFIERS, ToolItemInfo, TribeMemberAction, Vector } from "webgl-test-shared";
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

export let lightspeedIsActive = false;

export function setLightspeedIsActive(isActive: boolean): void {
   lightspeedIsActive = isActive;
}

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

export function updatePlayerItems(): void {
   if (definiteGameState.hotbar === null) {
      return;
   }

   // @Cleanup: destroy this.
   if (Player.instance !== null) {
      if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         Player.instance.updateActiveItem(definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot].type);
         Player.instance.updateChargeTexture();
      } else {
         Player.instance.updateActiveItem(null);
      }
   }

   // Decrement global item switch delay
   globalAttackDelayTimer -= 1 / SETTINGS.TPS;
   if (globalAttackDelayTimer < 0) {
      globalAttackDelayTimer = 0;
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

   Player.instance.lastActionTicks = Board.ticks;
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
      Client.sendThrowHeldItemPacket(Player.instance.rotation);
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
   
   const minChunkX = Math.max(Math.min(Math.floor((Player.instance.position.x - PLAYER_INTERACT_RANGE) / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((Player.instance.position.x + PLAYER_INTERACT_RANGE) / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((Player.instance.position.y - PLAYER_INTERACT_RANGE) / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((Player.instance.position.y + PLAYER_INTERACT_RANGE) / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   
   let minInteractionDistance = PLAYER_INTERACT_RANGE + Number.EPSILON;
   let closestInteractableEntity: Entity | null = null;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getEntities()) {
            if (entity.type === "barrel") {
               const distance = Player.instance.position.calculateDistanceBetween(entity.position);
               if (distance < minInteractionDistance) {
                  closestInteractableEntity = entity;
                  minInteractionDistance = distance;
               }
            } else if (entity.type === "tribesman") {
               // Only interact with tribesman inventories if the player is of the same tribe
               if ((entity as Tribesman).tribeID === null || ((entity as Tribesman).tribeID) !== Player.instance.tribeID) {
                  continue;
               }
               
               const distance = Player.instance.position.calculateDistanceBetween(entity.position);
               if (distance < minInteractionDistance) {
                  closestInteractableEntity = entity;
                  minInteractionDistance = distance;
               }
            } else if (entity.type === "campfire") {
               const distance = Player.instance.position.calculateDistanceBetween(entity.position);
               if (distance < minInteractionDistance) {
                  closestInteractableEntity = entity;
                  minInteractionDistance = distance;
               }
            } else if (entity.type === "furnace") {
               const distance = Player.instance.position.calculateDistanceBetween(entity.position);
               if (distance < minInteractionDistance) {
                  closestInteractableEntity = entity;
                  minInteractionDistance = distance;
               }
            } else if (entity.type === "tombstone") {
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
      case "barrel": {
         return InteractInventoryType.barrel;
      }
      case "tribesman": {
         return InteractInventoryType.tribesman;
      }
      case "campfire": {
         return InteractInventoryType.campfire;
      }
      case "furnace": {
         return InteractInventoryType.furnace;
      }
      case "tombstone": {
         return InteractInventoryType.tombstoneEpitaph;
      }
      default: {
         throw new Error(`Can't find appropriate interact inventory type for entity type'${entity.type}'.`);
      }
   }
}

const setInteractInventory = (inventoryType: InteractInventoryType, entity: Entity): void => {
   _interactInventoryIsOpen = true;
   InteractInventory_setInventory(inventoryType, entity);
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
      if (!Board.gameObjects.hasOwnProperty(interactInventoryEntity.id)) {
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
            setInteractInventory(interactInventoryType, interactInventoryEntity);
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
}

const isSlow = (): boolean => {
   return latencyGameState.playerAction === TribeMemberAction.eat || latencyGameState.playerAction === TribeMemberAction.charge_bow || latencyGameState.playerIsPlacingEntity;
}

const getPlayerTerminalVelocity = (): number => {
   if (isSlow()) {
      return PLAYER_SLOW_TERMINAL_VELOCITY;
   }
   return PLAYER_TERMINAL_VELOCITY;
}

const getPlayerAcceleration = (): number => {
   if (isSlow()) {
      return PLAYER_SLOW_ACCELERATION;
   }
   return PLAYER_ACCELERATION;
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
      if (lightspeedIsActive) {
         Player.instance.acceleration = new Vector(PLAYER_LIGHTSPEED_ACCELERATION, moveDirection);
         Player.instance.terminalVelocity = PLAYER_LIGHTSPEED_TERMINAL_VELOCITY;
      } else {
         const moveSpeedMultiplier = getPlayerMoveSpeedMultiplier();
         Player.instance.acceleration = new Vector(getPlayerAcceleration() * moveSpeedMultiplier, moveDirection);
         Player.instance.terminalVelocity = getPlayerTerminalVelocity() * moveSpeedMultiplier;
      }
   } else {
      Player.instance.acceleration = null;
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

   // 
   // Check for any collisions
   // 

   let placeTestHitbox: Hitbox;
   if (placeableInfo.hitboxType === PlaceableItemHitboxType.circular) {
      testCircularHitbox.radius = placeableInfo.width / 2; // For a circular hitbox, width and height will be the same
      placeTestHitbox = testCircularHitbox;
   } else {
      testRectangularHitbox.width = placeableInfo.width;
      testRectangularHitbox.height = placeableInfo.height;
      placeTestHitbox = testRectangularHitbox;
   }

   placeTestHitbox.setObject(Player.instance!);
   placeTestHitbox.offset = Point.fromVectorForm(SETTINGS.ITEM_PLACE_DISTANCE + placeableInfo.placeOffset, Player.instance!.rotation);

   placeTestHitbox.updatePosition();
   placeTestHitbox.updateHitboxBounds();

   const minChunkX = Math.max(Math.min(Math.floor(placeTestHitbox.bounds[0] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor(placeTestHitbox.bounds[1] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor(placeTestHitbox.bounds[2] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor(placeTestHitbox.bounds[3] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   
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
            // @Cleanup: Is this necessary?
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
   }

   latencyGameState.selectedHotbarItemSlot = itemSlot;
   globalAttackDelayTimer = GLOBAL_ATTACK_DELAY_ON_SWITCH;
      
   Hotbar_setHotbarSelectedItemSlot(itemSlot);

   // @Cleanup: Shouldn't be here
   if (Player.instance !== null) {
      if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         Player.instance.updateActiveItem(definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot].type);
         Player.instance.updateChargeTexture();
      } else {
         Player.instance.updateActiveItem(null);
      }
   }
}

const tickItem = (item: Item, itemSlot: number): void => {
   if (itemAttackCooldowns.hasOwnProperty(itemSlot)) {
      itemAttackCooldowns[itemSlot] -= 1 / SETTINGS.TPS;
      if (itemAttackCooldowns[itemSlot] < 0) {
         delete itemAttackCooldowns[itemSlot];
      }
   }

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
   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         latencyGameState.playerAction = TribeMemberAction.none;
         Player.instance!.action = TribeMemberAction.none;
         Player.instance!.foodEatingType = -1;

         break;
      }
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = false;
      }
   }
}