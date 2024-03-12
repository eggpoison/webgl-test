import { AttackPacket, EntityType, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, Inventory, Item, ItemType, PlaceableItemType, Point, Settings, STATUS_EFFECT_MODIFIERS, STRUCTURE_TYPES, StructureType, TRIBE_INFO_RECORD, ToolItemInfo, TribeMemberAction, TribeType, ServerComponentType, getSnapOffsetWidth, getSnapOffsetHeight, StructureTypeConst } from "webgl-test-shared";
import { addKeyListener, clearPressedKeys, keyIsPressed } from "./keyboard-input";
import { CraftingMenu_setIsVisible } from "./components/game/menus/CraftingMenu";
import Player from "./entities/Player";
import Client from "./client/Client";
import { Hotbar_setHotbarSelectedItemSlot, Hotbar_updateLeftThrownBattleaxeItemID, Hotbar_updateRightThrownBattleaxeItemID } from "./components/game/inventories/Hotbar";
import { BackpackInventoryMenu_setIsVisible } from "./components/game/inventories/BackpackInventory";
import Board from "./Board";
import { definiteGameState, latencyGameState } from "./game-state/game-states";
import Game from "./Game";
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
import Entity from "./Entity";
import { attemptStructureSelect, deselectSelectedEntity, getSelectedEntityID } from "./entity-selection";
import { playSound } from "./sound";
import { InventoryMenuType, InventorySelector_inventoryIsOpen, InventorySelector_setInventoryMenuType } from "./components/game/inventories/InventorySelector";
import { attemptToCompleteNode } from "./research";
import { spikesAreAttachedToWall } from "./entities/WoodenSpikes";
import { punjiSticksAreAttachedToWall } from "./entities/PunjiSticks";
import { blueprintMenuIsOpen, hideBlueprintMenu } from "./components/game/BlueprintMenu";
import Camera from "./Camera";

/** Acceleration of the player while moving without any modifiers. */
const PLAYER_ACCELERATION = 700;

const PLAYER_LIGHTSPEED_ACCELERATION = 15000;

/** Acceleration of the player while slowed. */
const PLAYER_SLOW_ACCELERATION = 400;

export let rightMouseButtonIsPressed = false;
export let leftMouseButtonIsPressed = false;

// Cleanup: All this item placing logic should be moved to another file

enum PlaceableItemHitboxType {
   circular,
   rectangular
}

export interface PlaceableEntityInfo {
   readonly entityType: EntityType;
   readonly width: number;
   readonly height: number;
   readonly hitboxType: PlaceableItemHitboxType;
   /** Optionally defines extra criteria for being placed */
   canPlace?(): boolean;
}

export const PLACEABLE_ENTITY_INFO_RECORD: Record<PlaceableItemType, PlaceableEntityInfo> = {
   [ItemType.workbench]: {
      entityType: EntityType.workbench,
      width: Workbench.SIZE,
      height: Workbench.SIZE,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.tribe_totem]: {
      entityType: EntityType.tribeTotem,
      width: TribeTotem.SIZE,
      height: TribeTotem.SIZE,
      canPlace: (): boolean => {
         // The player can only place one tribe totem
         return !Game.tribe.hasTotem;
      },
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.worker_hut]: {
      entityType: EntityType.workerHut,
      width: WorkerHut.SIZE,
      height: WorkerHut.SIZE,
      canPlace: (): boolean => {
         return Game.tribe.hasTotem && Game.tribe.numHuts < Game.tribe.tribesmanCap;
      },
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.warrior_hut]: {
      entityType: EntityType.warriorHut,
      width: WarriorHut.SIZE,
      height: WarriorHut.SIZE,
      canPlace: (): boolean => {
         return Game.tribe.hasTotem && Game.tribe.numHuts < Game.tribe.tribesmanCap;
      },
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.barrel]: {
      entityType: EntityType.barrel,
      width: Barrel.SIZE,
      height: Barrel.SIZE,
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.campfire]: {
      entityType: EntityType.campfire,
      width: Campfire.SIZE,
      height: Campfire.SIZE,
      hitboxType: PlaceableItemHitboxType.circular
   },
   [ItemType.furnace]: {
      entityType: EntityType.furnace,
      width: Furnace.SIZE,
      height: Furnace.SIZE,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.research_bench]: {
      entityType: EntityType.researchBench,
      width: 32 * 4,
      height: 20 * 4,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.wooden_wall]: {
      entityType: EntityType.woodenWall,
      width: 64,
      height: 64,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.planter_box]: {
      entityType: EntityType.planterBox,
      width: 80,
      height: 80,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.wooden_spikes]: {
      entityType: EntityType.woodenSpikes,
      width: 40,
      height: 40,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.punji_sticks]: {
      entityType: EntityType.punjiSticks,
      width: 40,
      height: 40,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.ballista]: {
      entityType: EntityType.ballista,
      width: 100,
      height: 100,
      hitboxType: PlaceableItemHitboxType.rectangular
   },
   [ItemType.sling_turret]: {
      entityType: EntityType.slingTurret,
      width: 72,
      height: 72,
      hitboxType: PlaceableItemHitboxType.circular
   }
};

const getPlaceableEntityWidth = (entityType: EntityType, isPlacedOnWall: boolean): number | null => {
   if (entityType === EntityType.woodenSpikes) {
      return isPlacedOnWall ? 56 : 48;
   } else if (entityType === EntityType.punjiSticks) {
      return isPlacedOnWall ? 56 : 48;
   }
   return null;
}

const getPlaceableEntityHeight = (entityType: EntityType, isPlacedOnWall: boolean): number | null => {
   if (entityType === EntityType.woodenSpikes) {
      return isPlacedOnWall ? 28 : 48;
   } else if (entityType === EntityType.punjiSticks) {
      return isPlacedOnWall ? 32 : 48;
   }
   return null;
}

const testRectangularHitbox = new RectangularHitbox(1, -1, -1);
const testCircularHitbox = new CircularHitbox(1, -1);

const hotbarItemAttackCooldowns: Record<number, number> = {};
const offhandItemAttackCooldowns: Record<number, number> = {};

/** Whether the inventory is open or not. */
let _inventoryIsOpen = false;

// let _interactInventoryIsOpen = false;
// let interactInventoryEntity: Entity | null = null;

// export function getInteractEntityID(): number | null {
//    return interactInventoryEntity !== null ? interactInventoryEntity.id : null;
// }

const updateAttackCooldowns = (inventory: Inventory, attackCooldowns: Record<number, number>): void => {
   for (let itemSlot = 1; itemSlot <= inventory.width; itemSlot++) {
      if (attackCooldowns.hasOwnProperty(itemSlot)) {
         attackCooldowns[itemSlot] -= 1 / Settings.TPS;
         if (attackCooldowns[itemSlot] < 0) {
            delete attackCooldowns[itemSlot];
         }
      }
   }
}

export function updatePlayerItems(): void {
   if (definiteGameState.hotbar === null || Player.instance === null) {
      return;
   }

   // @Cleanup: destroy this.

   // const inventoryUseComponent = Player.instance.getComponent(ServerComponentType.inventoryUse);
   // if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
   //    inventoryUseComponent.useInfos[0].act = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   //    // Player.instance.updateBowChargeTexture();
   // } else {
   //    Player.instance.rightActiveItem = null;
   // }
   // if (definiteGameState.offhandInventory.itemSlots.hasOwnProperty(1)) {
   //    Player.instance.leftActiveItem = definiteGameState.offhandInventory.itemSlots[1];
   // } else {
   //    Player.instance.leftActiveItem = null;
   // }
   // Player.instance.updateHands();

   // Player.instance.updateArmourRenderPart(definiteGameState.armourSlot.itemSlots.hasOwnProperty(1) ? definiteGameState.armourSlot.itemSlots[1].type : null);
   // Player.instance.updateGloveRenderPart(definiteGameState.gloveSlot.itemSlots.hasOwnProperty(1) ? definiteGameState.gloveSlot.itemSlots[1].type : null);

   // Player.instance!.updateBowChargeTexture();

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
      const limbIdx = isOffhand ? 1 : 0;
      const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
      inventoryUseComponent.useInfos[limbIdx].lastAttackTicks = Board.ticks;
   }
}

const attemptInventoryAttack = (inventory: Inventory): boolean => {
   const isOffhand = inventory.name !== "hotbar";

   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   const useInfo = inventoryUseComponent.useInfos[isOffhand ? 1 : 0];
   
   const attackCooldowns = isOffhand ? offhandItemAttackCooldowns : hotbarItemAttackCooldowns;
   const selectedItemSlot = useInfo.selectedItemSlot;

   if (inventory.itemSlots.hasOwnProperty(selectedItemSlot)) {
      // Don't attack if the hand is busy waiting for a battleaxe to return
      const selectedItem = inventory.itemSlots[selectedItemSlot];
      if (useInfo.thrownBattleaxeItemID === selectedItem.id) {
         return false;
      }

      // Attack with item
      if (!attackCooldowns.hasOwnProperty(selectedItemSlot)) {
         attack(isOffhand);
         
         // Reset the attack cooldown of the weapon
         const itemTypeInfo = ITEM_TYPE_RECORD[selectedItem.type];
         if (itemTypeInfo === "axe" || itemTypeInfo === "pickaxe" || itemTypeInfo === "sword" || itemTypeInfo === "spear" || itemTypeInfo === "hammer" || itemTypeInfo === "battleaxe" || itemTypeInfo === "crossbow") {
            const itemInfo = ITEM_INFO_RECORD[selectedItem.type];
            attackCooldowns[selectedItemSlot] = (itemInfo as ToolItemInfo).attackCooldown;
         } else {
            attackCooldowns[selectedItemSlot] = Settings.DEFAULT_ATTACK_COOLDOWN;
         }

         return true;
      }
   } else {
      // Attack without item
      if (!attackCooldowns.hasOwnProperty(selectedItemSlot)) {
         attack(isOffhand);
         attackCooldowns[selectedItemSlot] = Settings.DEFAULT_ATTACK_COOLDOWN;

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
   readonly itemSlot: number;
   readonly isOffhand: boolean;
}

const getSelectedItemInfo = (): SelectedItemInfo | null => {
   if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
      const item = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
      return {
         item: item,
         itemSlot: latencyGameState.selectedHotbarItemSlot,
         isOffhand: false
      };
   }

   if (definiteGameState.offhandInventory.itemSlots.hasOwnProperty(1)) {
      const item = definiteGameState.offhandInventory.itemSlots[1];
      return {
         item: item,
         itemSlot: 1,
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
            itemRightClickDown(selectedItemInfo.item, selectedItemInfo.isOffhand, selectedItemInfo.itemSlot);
         }
         
         attemptStructureSelect();
         attemptToCompleteNode();
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
   for (let itemSlot = 1; itemSlot <= Settings.INITIAL_PLAYER_HOTBAR_SIZE; itemSlot++) {
      addKeyListener(itemSlot.toString(), () => selectItemSlot(itemSlot));
   }
   addKeyListener("!", () => selectItemSlot(1));
   addKeyListener("@", () => selectItemSlot(2));
   addKeyListener("#", () => selectItemSlot(3));
   addKeyListener("$", () => selectItemSlot(4));
   addKeyListener("%", () => selectItemSlot(5));
   addKeyListener("^", () => selectItemSlot(6));
   addKeyListener("&", () => selectItemSlot(7));
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

/** Creates the key listener to toggle the inventory on and off. */
const createInventoryToggleListeners = (): void => {
   addKeyListener("e", () => {
      if (!Game.isRunning) {
         return;
      }

      if (blueprintMenuIsOpen()) {
         hideBlueprintMenu();
         deselectSelectedEntity();
         return;
      }

      if (InventorySelector_inventoryIsOpen()) {
         InventorySelector_setInventoryMenuType(InventoryMenuType.none);
         return;
      }

      updateInventoryIsOpen(!_inventoryIsOpen);
   });

   addKeyListener("i", () => {
      if (_inventoryIsOpen) {
         updateInventoryIsOpen(false);
         return;
      }
   });
   addKeyListener("escape", () => {
      if (techTreeIsOpen()) {
         closeTechTree();
         return;
      }

      if (_inventoryIsOpen) {
         updateInventoryIsOpen(false);
         return;
      }

      if (getSelectedEntityID() !== -1) {
         deselectSelectedEntity();
      }
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
         newSlot += Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      } else if (newSlot > Settings.INITIAL_PLAYER_HOTBAR_SIZE) {
         newSlot -= Settings.INITIAL_PLAYER_HOTBAR_SIZE;
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

   const statusEffectComponent = Player.instance!.getServerComponent(ServerComponentType.statusEffect);
   for (const statusEffect of statusEffectComponent.statusEffects) {
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
      } else if (latencyGameState.mainAction === TribeMemberAction.eat || latencyGameState.mainAction === TribeMemberAction.chargeBow || latencyGameState.mainAction === TribeMemberAction.loadCrossbow || latencyGameState.playerIsPlacingEntity) {
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
   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   const useInfo = inventoryUseComponent.useInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "spear":
      case "battleaxe":
      case "bow": {
         useInfo.currentAction = TribeMemberAction.none;
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.none;
         } else {
            latencyGameState.mainAction = TribeMemberAction.none;
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

const calculateRegularPlacePosition = (placeableEntityInfo: PlaceableEntityInfo, isVisualPosition: boolean): Point => {
   let placeOrigin: Point;
   if (isVisualPosition) {
      placeOrigin = Camera.position;
   } else {
      placeOrigin = Player.instance!.position;
   }
   
   const placeOffset = placeableEntityInfo.height / 2;
   const placePositionX = placeOrigin.x + (Settings.ITEM_PLACE_DISTANCE + placeOffset) * Math.sin(Player.instance!.rotation);
   const placePositionY = placeOrigin.y + (Settings.ITEM_PLACE_DISTANCE + placeOffset) * Math.cos(Player.instance!.rotation);
   return new Point(placePositionX, placePositionY);
}

const entityIsPlacedOnWall = (entity: Entity): boolean => {
   if (entity.type === EntityType.woodenSpikes) {
      return spikesAreAttachedToWall(entity);
   } else if (entity.type === EntityType.punjiSticks) {
      return punjiSticksAreAttachedToWall(entity);
   }
   return false;
}

const calculateStructureSnapPositions = (snapOrigin: Point, snapEntity: Entity, placeRotation: number, isPlacedOnWall: boolean, placeableEntityInfo: PlaceableEntityInfo): ReadonlyArray<Point> => {
   const snapPositions = new Array<Point>();
   for (let i = 0; i < 4; i++) {
      const direction = i * Math.PI / 2 + snapEntity.rotation;
      let snapEntityOffset: number;
      if (i % 2 === 0) {
         // Top and bottom snap positions
         // @Incomplete: is wall
         snapEntityOffset = getSnapOffsetHeight(snapEntity.type as unknown as StructureTypeConst, entityIsPlacedOnWall(snapEntity)) * 0.5;
      } else {
         // Left and right snap positions
         snapEntityOffset = getSnapOffsetWidth(snapEntity.type as unknown as StructureTypeConst, entityIsPlacedOnWall(snapEntity)) * 0.5;
      }

      const epsilon = 0.01; // @Speed: const enum?
      let structureOffsetI = i;
      // If placing on the left or right side of the snap entity, use the width offset
      if (!(Math.abs(direction - placeRotation) < epsilon || Math.abs(direction - (placeRotation + Math.PI)) < epsilon)) {
         structureOffsetI++;
      }

      let structureOffset: number;
      if (structureOffsetI % 2 === 0 || (isPlacedOnWall && (placeableEntityInfo.entityType === EntityType.woodenSpikes || placeableEntityInfo.entityType === EntityType.punjiSticks))) {
         // Top and bottom
         structureOffset = getSnapOffsetHeight(placeableEntityInfo.entityType as unknown as StructureTypeConst, isPlacedOnWall) * 0.5;
      } else {
         // Left and right
         structureOffset = getSnapOffsetWidth(placeableEntityInfo.entityType as unknown as StructureTypeConst, isPlacedOnWall) * 0.5;
      }

      const offset = snapEntityOffset + structureOffset;
      const positionX = snapOrigin.x + offset * Math.sin(direction);
      const positionY = snapOrigin.y + offset * Math.cos(direction);
      snapPositions.push(new Point(positionX, positionY));
   }

   return snapPositions;
}

// @Incomplete: fix placing spike snapped to other spike is sometimes illegal

const calculateStructureSnapPosition = (snapPositions: ReadonlyArray<Point>, regularPlacePosition: Point): Point | null => {
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestPosition: Point | null = null;
   for (let i = 0; i < 4; i++) {
      const position = snapPositions[i];

      const dist = position.calculateDistanceBetween(regularPlacePosition);
      if (dist < minDist) {
         minDist = dist;
         closestPosition = position;
      }
   }

   return closestPosition;
}

interface BuildingSnapInfo {
   /** -1 if no snap was found */
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
   readonly entityType: EntityType;
   readonly snappedEntityID: number;
}
export function calculateSnapInfo(placeableEntityInfo: PlaceableEntityInfo, isVisualPosition: boolean): BuildingSnapInfo | null {
   const regularPlacePosition = calculateRegularPlacePosition(placeableEntityInfo, isVisualPosition);

   const minChunkX = Math.max(Math.floor((regularPlacePosition.x - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((regularPlacePosition.x + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((regularPlacePosition.y - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((regularPlacePosition.y + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   
   const snappableEntities = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const distance = regularPlacePosition.calculateDistanceBetween(entity.position);
            if (distance > Settings.STRUCTURE_SNAP_RANGE) {
               continue;
            }
            
            if (STRUCTURE_TYPES.includes(entity.type as StructureType)) {
               snappableEntities.push(entity);
            }
         }
      }
   }

   for (const snapEntity of snappableEntities) {
      // @Incomplete
      let snapOrigin: Point;
      switch (snapEntity.type as StructureType) {
         case EntityType.woodenWall:
         case EntityType.woodenDoor:
         case EntityType.woodenSpikes:
         case EntityType.woodenTunnel:
         case EntityType.punjiSticks:
         case EntityType.slingTurret:
         case EntityType.ballista: {
            snapOrigin = snapEntity.position;
            break;
         }
         case EntityType.woodenEmbrasure: {
            const x = snapEntity.position.x - 22 * Math.sin(snapEntity.rotation);
            const y = snapEntity.position.y - 22 * Math.cos(snapEntity.rotation);
            snapOrigin = new Point(x, y);
         }
      }

      const isPlacedOnWall = snapEntity.type === EntityType.woodenWall;

      // @Cleanup
      let clampedSnapRotation = snapEntity.rotation;
      while (clampedSnapRotation >= Math.PI * 0.25) {
         clampedSnapRotation -= Math.PI * 0.5;
      }
      while (clampedSnapRotation < Math.PI * 0.25) {
         clampedSnapRotation += Math.PI * 0.5;
      }
      const placeRotation = Math.round(Player.instance!.rotation / (Math.PI * 0.5)) * Math.PI * 0.5 + clampedSnapRotation;

      const snapPositions = calculateStructureSnapPositions(snapOrigin, snapEntity, placeRotation, isPlacedOnWall, placeableEntityInfo);
      const snapPosition = calculateStructureSnapPosition(snapPositions, regularPlacePosition);
      if (snapPosition !== null) {
         let finalPlaceRotation = placeRotation;
         if (isPlacedOnWall && (placeableEntityInfo.entityType === EntityType.woodenSpikes || placeableEntityInfo.entityType === EntityType.punjiSticks)) {
            finalPlaceRotation = snapEntity.position.calculateAngleBetween(snapPosition);
         }
         return {
            x: snapPosition.x,
            y: snapPosition.y,
            rotation: finalPlaceRotation,
            entityType: placeableEntityInfo.entityType,
            snappedEntityID: snapEntity.id
         };
      }
   }
   
   return null;
}

export function calculatePlacePosition(placeableEntityInfo: PlaceableEntityInfo, snapInfo: BuildingSnapInfo | null, isVisualPosition: boolean): Point {
   if (snapInfo === null) {
      return calculateRegularPlacePosition(placeableEntityInfo, isVisualPosition);
   }

   return new Point(snapInfo.x, snapInfo.y);
}

export function calculatePlaceRotation(snapInfo: BuildingSnapInfo | null): number {
   if (snapInfo === null) {
      return Player.instance!.rotation;
   }

   return snapInfo.rotation;
}

export function canPlaceItem(placePosition: Point, placeRotation: number, item: Item, placingEntityType: EntityType, isPlacedOnWall: boolean): boolean {
   if (!PLACEABLE_ENTITY_INFO_RECORD.hasOwnProperty(item.type)) {
      throw new Error(`Item type '${item.type}' is not placeable.`);
   }
   
   // Check for any special conditions
   const placeableInfo = PLACEABLE_ENTITY_INFO_RECORD[item.type as PlaceableItemType];
   if (typeof placeableInfo.canPlace !== "undefined" && !placeableInfo.canPlace()) {
      return false;
   }

   let width = getPlaceableEntityWidth(placingEntityType, isPlacedOnWall);
   let height = getPlaceableEntityHeight(placingEntityType, isPlacedOnWall);
   if (width === null) {
      width = placeableInfo.width;
   }
   if (height === null) {
      height = placeableInfo.height;
   }

   let placeTestHitbox: Hitbox;
   if (placeableInfo.hitboxType === PlaceableItemHitboxType.circular) {
      testCircularHitbox.radius = width / 2; // For a circular hitbox, width and height will be the same
      placeTestHitbox = testCircularHitbox;
   } else {
      testRectangularHitbox.width = width;
      testRectangularHitbox.height = height;
      testRectangularHitbox.recalculateHalfDiagonalLength();
      testRectangularHitbox.rotation = placeRotation;
      testRectangularHitbox.externalRotation = 0;
      placeTestHitbox = testRectangularHitbox;
   }
   
   placeTestHitbox.offset.x = 0;
   placeTestHitbox.offset.y = 0;
   placeTestHitbox.position.x = placePosition.x;
   placeTestHitbox.position.y = placePosition.y;
   placeTestHitbox.updateHitboxBounds(0);

   // Don't allow placing buildings in borders
   if (placeTestHitbox.bounds[0] < 0 || placeTestHitbox.bounds[1] >= Settings.BOARD_UNITS || placeTestHitbox.bounds[2] < 0 || placeTestHitbox.bounds[3] >= Settings.BOARD_UNITS) {
      return false;
   }

   // 
   // Check for entity collisions
   // 

   const minChunkX = Math.floor(placeTestHitbox.bounds[0] / Settings.CHUNK_UNITS);
   const maxChunkX = Math.floor(placeTestHitbox.bounds[1] / Settings.CHUNK_UNITS);
   const minChunkY = Math.floor(placeTestHitbox.bounds[2] / Settings.CHUNK_UNITS);
   const maxChunkY = Math.floor(placeTestHitbox.bounds[3] / Settings.CHUNK_UNITS);
   
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            for (const hitbox of entity.hitboxes) {   
               if (placeTestHitbox.isColliding(hitbox)) {
                  return false;
               }
            }
         }
      }
   }

   // 
   // Check for wall tile collisions
   // 

   // @Speed: Garbage collection
   const tileHitbox = new RectangularHitbox(1, Settings.TILE_SIZE, Settings.TILE_SIZE);

   const minTileX = Math.floor(placeTestHitbox.bounds[0] / Settings.TILE_SIZE);
   const maxTileX = Math.floor(placeTestHitbox.bounds[1] / Settings.TILE_SIZE);
   const minTileY = Math.floor(placeTestHitbox.bounds[2] / Settings.TILE_SIZE);
   const maxTileY = Math.floor(placeTestHitbox.bounds[3] / Settings.TILE_SIZE);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (!tile.isWall) {
            continue;
         }

         tileHitbox.position.x = (tileX + 0.5) * Settings.TILE_SIZE;
         tileHitbox.position.y = (tileY + 0.5) * Settings.TILE_SIZE;
         tileHitbox.updateHitboxBounds(0);

         if (placeTestHitbox.isColliding(tileHitbox)) {
            return false;
         }
      }
   }

   return true;
}

const itemRightClickDown = (item: Item, isOffhand: boolean, itemSlot: number): void => {
   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   const useInfo = inventoryUseComponent.useInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
         if (definiteGameState.playerHealth < maxHealth) {
            useInfo.currentAction = TribeMemberAction.eat;
            useInfo.lastEatTicks = Board.ticks;
            if (isOffhand) {
               latencyGameState.offhandAction = TribeMemberAction.eat;
            } else {
               latencyGameState.mainAction = TribeMemberAction.eat;
            }
         }

         break;
      }
      case "crossbow": {
         if (!definiteGameState.hotbarCrossbowLoadProgressRecord.hasOwnProperty(itemSlot) || definiteGameState.hotbarCrossbowLoadProgressRecord[itemSlot] < 1) {
            // Start loading crossbow
            useInfo.currentAction = TribeMemberAction.loadCrossbow;
            useInfo.lastCrossbowLoadTicks = Board.ticks;
            if (isOffhand) {
               latencyGameState.offhandAction = TribeMemberAction.loadCrossbow;
            } else {
               latencyGameState.mainAction = TribeMemberAction.loadCrossbow;
            }
            playSound("crossbow-load.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
         } else {
            // Fire crossbow
            Client.sendItemUsePacket();
            playSound("crossbow-fire.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
         }
         break;
      }
      case "bow": {
         useInfo.currentAction = TribeMemberAction.chargeBow;
         useInfo.lastBowChargeTicks = Board.ticks;
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.chargeBow;
         } else {
            latencyGameState.mainAction = TribeMemberAction.chargeBow;
         }
         
         playSound("bow-charge.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);

         break;
      }
      case "spear": {
         useInfo.currentAction = TribeMemberAction.chargeSpear;
         useInfo.lastSpearChargeTicks = Board.ticks;
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.chargeSpear;
         } else {
            latencyGameState.mainAction = TribeMemberAction.chargeSpear;
         }
         break;
      }
      case "battleaxe": {
         // If an axe is already thrown, don't throw another
         if (useInfo.thrownBattleaxeItemID !== -1) {
            break;
         }

         useInfo.currentAction = TribeMemberAction.chargeBattleaxe;
         useInfo.lastBattleaxeChargeTicks = Board.ticks;
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.chargeBattleaxe;
         } else {
            latencyGameState.mainAction = TribeMemberAction.chargeBattleaxe;
         }
         break;
      }
      case "glove":
      case "armour": {
         Client.sendItemUsePacket();
         break;
      }
      case "placeable": {
         const placeableEntityInfo = PLACEABLE_ENTITY_INFO_RECORD[item.type as PlaceableItemType]!;
         const snapInfo = calculateSnapInfo(placeableEntityInfo, false);
         const placePosition = calculatePlacePosition(placeableEntityInfo, snapInfo, false);
         const placeRotation = calculatePlaceRotation(snapInfo);

         const isPlacedOnWall = snapInfo !== null && Board.entityRecord[snapInfo.snappedEntityID].type === EntityType.woodenWall;
         if (!canPlaceItem(placePosition, placeRotation, item, snapInfo !== null ? snapInfo.entityType : placeableEntityInfo.entityType, isPlacedOnWall)) {
            return;
         }

         Client.sendItemUsePacket();

         useInfo.lastAttackTicks = Board.ticks;

         break;
      }
   }
}

const itemRightClickUp = (item: Item, isOffhand: boolean): void => {
   const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   const useInfo = inventoryUseComponent.useInfos[isOffhand ? 1 : 0];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         useInfo.currentAction = TribeMemberAction.none;
         
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.none;
         } else {
            latencyGameState.mainAction = TribeMemberAction.none;
         }

         break;
      }
      case "battleaxe":
      case "spear":
      case "bow": {
         if (itemCategory === "battleaxe") {
            if (useInfo.thrownBattleaxeItemID !== -1 || useInfo.currentAction !== TribeMemberAction.chargeBattleaxe) {
               break;
            }

            useInfo.thrownBattleaxeItemID = item.id;

            if (isOffhand) {
               // If an axe is already thrown, don't throw another
               Hotbar_updateLeftThrownBattleaxeItemID(item.id);
            } else {
               Hotbar_updateRightThrownBattleaxeItemID(item.id);
            }
         }

         Client.sendItemUsePacket();

         useInfo.currentAction = TribeMemberAction.none;
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.none;
         } else {
            latencyGameState.mainAction = TribeMemberAction.none;
         }

         // @Incomplete: Don't play if bow didn't actually fire an arrow
         switch (item.type) {
            case ItemType.wooden_bow: {
               playSound("bow-fire.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
               break;
            }
            case ItemType.reinforced_bow: {
               playSound("reinforced-bow-fire.mp3", 0.2, 1, Player.instance!.position.x, Player.instance!.position.y);
               break;
            }
            case ItemType.ice_bow: {
               playSound("ice-bow-fire.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
               break;
            }
         }

         break;
      }
      case "crossbow": {
         useInfo.currentAction = TribeMemberAction.none;
         if (isOffhand) {
            latencyGameState.offhandAction = TribeMemberAction.none;
         } else {
            latencyGameState.mainAction = TribeMemberAction.none;
         }
         break;
      }
   }
}

const selectItemSlot = (itemSlot: number): void => {
   if (definiteGameState.hotbar === null || itemSlot === latencyGameState.selectedHotbarItemSlot || Player.instance === null) {
      return;
   }

   // Deselect the previous item and select the new item
   if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
      deselectItem(definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot], false);
   }
   if (definiteGameState.hotbar.itemSlots.hasOwnProperty(itemSlot)) {
      selectItem(definiteGameState.hotbar.itemSlots[itemSlot]);
      if (rightMouseButtonIsPressed && ITEM_TYPE_RECORD[definiteGameState.hotbar.itemSlots[itemSlot].type] === "bow") {
         itemRightClickDown(definiteGameState.hotbar.itemSlots[itemSlot], false, itemSlot);
      }
   }

   latencyGameState.selectedHotbarItemSlot = itemSlot;
      
   Hotbar_setHotbarSelectedItemSlot(itemSlot);

   const playerInventoryUseComponent = Player.instance.getServerComponent(ServerComponentType.inventoryUse);
   const hotbarUseInfo = playerInventoryUseComponent.getUseInfo("hotbar");
   hotbarUseInfo.selectedItemSlot = itemSlot;

   // @Cleanup: Copy and paste, and shouldn't be here
   // if (Player.instance !== null) {
   //    if (definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
   //       Player.instance.rightActiveItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   //       // Player.instance.updateBowChargeTexture();
   //    } else {
   //       Player.instance.rightActiveItem = null;
   //    }
   //    if (definiteGameState.offhandInventory.itemSlots.hasOwnProperty(1)) {
   //       Player.instance.leftActiveItem = definiteGameState.offhandInventory.itemSlots[1];
   //    } else {
   //       Player.instance.leftActiveItem = null;
   //    }
   //    // Player.instance!.updateHands();
   // }
}

const tickItem = (item: Item, itemSlot: number): void => {

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   switch (itemCategory) {
      case "food": {
         const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
         const useInfo = inventoryUseComponent.useInfos[0];

         // If the player can no longer eat food without wasting it, stop eating
         const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
         if (itemSlot === latencyGameState.selectedHotbarItemSlot && latencyGameState.mainAction === TribeMemberAction.eat && definiteGameState.playerHealth >= maxHealth) {
            latencyGameState.mainAction = TribeMemberAction.none;
            useInfo.currentAction = TribeMemberAction.none;
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
         const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
         const useInfo = inventoryUseComponent.useInfos[0];

         latencyGameState.mainAction = TribeMemberAction.none;
         useInfo.currentAction = TribeMemberAction.none;

         break;
      }
      case "placeable": {
         latencyGameState.playerIsPlacingEntity = false;
      }
   }
}