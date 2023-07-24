import { AttackPacket, SETTINGS, STATUS_EFFECT_MODIFIERS, Vector } from "webgl-test-shared";
import { addKeyListener, clearPressedKeys, keyIsPressed } from "./keyboard-input";
import { BackpackInventoryMenu_setIsVisible } from "./components/game/inventories/BackpackInventory";
import { CraftingMenu_setIsVisible } from "./components/game/menus/CraftingMenu";
import Player from "./entities/Player";
import Client from "./client/Client";
import Game from "./Game";
import { Hotbar_setHotbarSelectedItemSlot } from "./components/game/inventories/Hotbar";
import GameObject from "./GameObject";

let lightspeedIsActive = false;

export function setLightspeedIsActive(isActive: boolean): void {
   lightspeedIsActive = isActive;
}

/** How far away from the entity the attack is done */
const PLAYER_ATTACK_OFFSET = 80;
/** Max distance from the attack position that the attack will be registered from */
const PLAYER_ATTACK_TEST_RADIUS = 48;

/** Terminal velocity of the player while moving without any modifiers. */
const PLAYER_TERMINAL_VELOCITY = 300;

const PLAYER_LIGHTSPEED_TERMINAL_VELOCITY = 5000;

/** Acceleration of the player while moving without any modifiers. */
const PLAYER_ACCELERATION = 900;

const PLAYER_LIGHTSPEED_ACCELERATION = 15000;

/** Terminal velocity of the player while slowed. */
const PLAYER_SLOW_TERMINAL_VELOCITY = 150;
/** Acceleration of the player while slowed. */
const PLAYER_SLOW_ACCELERATION = 600;

/** Whether the inventory is open or not. */
let _inventoryIsOpen = false;

/** Calculates which entities would be the target of a player attack in the current game state. */
export function calculatePlayerAttackTargets(): ReadonlyArray<GameObject> {
   if (Player.instance === null) return [];
   
   const offset = new Vector(PLAYER_ATTACK_OFFSET, Player.instance.rotation);
   const attackPosition = Player.instance.position.copy();
   attackPosition.add(offset.convertToPoint());

   const minChunkX = Math.max(Math.min(Math.floor((attackPosition.x - PLAYER_ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((attackPosition.x + PLAYER_ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((attackPosition.y - PLAYER_ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((attackPosition.y + PLAYER_ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

   // Find all attacked entities
   const attackedGameObjects = new Array<GameObject>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Game.board.getChunk(chunkX, chunkY);

         for (const gameObject of chunk.getGameObjects()) {
            // Skip entities that are already in the array
            if (attackedGameObjects.includes(gameObject)) continue;

            const dist = Game.board.calculateDistanceBetweenPointAndGameObject(attackPosition, gameObject);
            if (dist <= PLAYER_ATTACK_TEST_RADIUS) attackedGameObjects.push(gameObject);
         }
      }
   }
   
   // Don't attack yourself
   while (true) {
      const idx = attackedGameObjects.indexOf(Player.instance);
      if (idx !== -1) {
         attackedGameObjects.splice(idx, 1);
      } else {
         break;
      }
   }

   return attackedGameObjects;
}

const attack = (): void => {
   if (Player.instance === null) return;
      
   const attackTargets = calculatePlayerAttackTargets();
   const attackPacket: AttackPacket = {
      itemSlot: Game.latencyGameState.selectedHotbarItemSlot,
      attackDirection: Player.instance.rotation,
      targetEntities: attackTargets.map(entity => entity.id)
   };
   Client.sendAttackPacket(attackPacket);
}

const createItemUseListeners = (): void => {
   document.addEventListener("mousedown", e => {
      if (Player.instance === null || Game.definiteGameState.playerIsDead()) return;

      // Only attempt to use an item if the game canvas was clicked
      if ((e.target as HTMLElement).id !== "game-canvas") {
         return;
      }

      const selectedItem = Game.definiteGameState.hotbarItemSlots[Game.latencyGameState.selectedHotbarItemSlot];

      if (e.button === 0) {
         // Left click
         if (typeof selectedItem !== "undefined") {
            selectedItem.resetAttackSwitchDelay();
         }

         attack();
      } else if (e.button === 2) {
         // Right click
         if (typeof selectedItem !== "undefined" && typeof selectedItem.onRightMouseButtonDown !== "undefined") {
            selectedItem.onRightMouseButtonDown();
         }
      }
   });

   document.addEventListener("mouseup", e => {
      if (Player.instance === null || Game.definiteGameState.playerIsDead()) return;

      // Only attempt to use an item if the game canvas was clicked
      if ((e.target as HTMLElement).id !== "game-canvas") {
         return;
      }

      const selectedItem = Game.definiteGameState.hotbarItemSlots[Game.latencyGameState.selectedHotbarItemSlot];

      if (typeof selectedItem === "undefined") {
         return;
      }

      if (e.button === 2) {
         // Right mouse button up
         if (typeof selectedItem.onRightMouseButtonUp !== "undefined") {
            selectedItem.onRightMouseButtonUp();
         }
      }
   });

   // Stop the context menu from appearing
   document.addEventListener("contextmenu", e => {
      for (const element of e.composedPath()) {
         if ((element as HTMLElement).id === "inventory") {
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

const selectItemSlot = (itemSlot: number): void => {
   // If an item was seleted before switching, deselect it
   if (itemSlot !== Game.latencyGameState.selectedHotbarItemSlot && Game.definiteGameState.hotbarItemSlots.hasOwnProperty(Game.latencyGameState.selectedHotbarItemSlot)) {
      Game.definiteGameState.hotbarItemSlots[Game.latencyGameState.selectedHotbarItemSlot]!.deselect();
   }

   Game.latencyGameState.selectedHotbarItemSlot = itemSlot;

   // Select any new item
   if (Game.definiteGameState.hotbarItemSlots.hasOwnProperty(itemSlot)) {
      Game.definiteGameState.hotbarItemSlots[itemSlot]!.select();
   }
   
   Hotbar_setHotbarSelectedItemSlot(itemSlot);
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
   if (!_inventoryIsOpen && Game.definiteGameState.heldItemSlot !== null) {
      throwHeldItem();
   }
}

/** Creates the key listener to toggle the inventory on and off. */
const createInventoryToggleListeners = (): void => {
   addKeyListener("e", () => {
      updateInventoryIsOpen(!_inventoryIsOpen);
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

const getPlayerTerminalVelocity = (): number => {
   if (Game.latencyGameState.playerIsEating || Game.latencyGameState.playerIsPlacingEntity) {
      return PLAYER_SLOW_TERMINAL_VELOCITY;
   }

   return PLAYER_TERMINAL_VELOCITY;
}

const getPlayerAcceleration = (): number => {
   if (Game.latencyGameState.playerIsEating || Game.latencyGameState.playerIsPlacingEntity) {
      return PLAYER_SLOW_ACCELERATION;
   }

   return PLAYER_ACCELERATION;
}

const getPlayerMoveSpeedMultiplier = (): number => {
   let moveSpeedMultiplier = 1;

   for (const statusEffect of Player.instance!.statusEffects) {
      moveSpeedMultiplier *= STATUS_EFFECT_MODIFIERS[statusEffect].moveSpeedMultiplier;
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