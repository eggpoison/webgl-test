import { AttackPacket, CraftingRecipe, CraftingStation, CRAFTING_RECIPES, HitboxType, HitData, ItemType, Point, SETTINGS, Vector } from "webgl-test-shared";
import Camera from "../Camera";
import Client from "../client/Client";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import { updateHealthBar } from "../components/game/HealthBar";
import { setHeldItemVisual } from "../components/game/HeldItem";
import { setHotbarInventory, setHotbarSelectedItemSlot } from "../components/game/Hotbar";
import { setCraftingMenuAvailableRecipes, setCraftingMenuAvailableCraftingStations, setCraftingMenuOutputItem } from "../components/game/menus/CraftingMenu";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Hitbox from "../hitboxes/Hitbox";
import Item from "../items/Item";
import { addKeyListener, clearPressedKeys, keyIsPressed } from "../keyboard-input";
import { cursorX, cursorY } from "../mouse";
import RenderPart from "../render-parts/RenderPart";
import { halfWindowHeight, halfWindowWidth } from "../webgl";
import Entity from "./Entity";

export type Inventory = { [itemSlot: number]: Item };

const CRAFTING_RECIPE_RECORD: Record<CraftingStation | "hand", Array<CraftingRecipe>> = {
   hand: [],
   workbench: []
};

// Categorise the crafting recipes
for (const craftingRecipe of CRAFTING_RECIPES) {
   if (typeof craftingRecipe.craftingStation === "undefined") {
      CRAFTING_RECIPE_RECORD.hand.push(craftingRecipe);
   } else {
      CRAFTING_RECIPE_RECORD[craftingRecipe.craftingStation].push(craftingRecipe);
   }
}

class Player extends Entity {
   private static readonly MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION: number = 250;

   public static readonly MAX_HEALTH = 20;
   
   public static instance: Player | null = null;

   public static username: string;

   public static hotbarInventory: Inventory = {};
   public static selectedHotbarItemSlot = 1;

   public static craftingOutputItem: Item | null = null;

   public static heldItem: Item | null = null;

   /** Health of the instance player */
   public static health = 20;

   public readonly type = "player";
   
   public readonly displayName: string;

   /** How far away from the entity the attack is done */
   private static readonly ATTACK_OFFSET = 80;
   /** Max distance from the attack position that the attack will be registered from */
   private static readonly ATTACK_TEST_RADIUS = 48;

   private static readonly ACCELERATION = 1000;
   private static readonly TERMINAL_VELOCITY = 300;

   public static readonly HITBOXES: ReadonlySet<Hitbox<HitboxType>> = new Set<Hitbox<HitboxType>>([
      new CircularHitbox({
         type: "circular",
         radius: 32
      })
   ]);

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, displayName: string, isInstance: boolean = false) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.addRenderParts([
         new RenderPart({
            width: 64,
            height: 64,
            textureSource: "human/human1.png"
         })
      ]);

      this.displayName = displayName;

      if (isInstance) {
         if (Player.instance !== null) {
            throw new Error("Tried to create a new player main instance when one already existed!");
         }
         
         Player.instance = this;

         Camera.position = this.position;

         Player.createKeyListeners();
         Player.createItemUseListeners();
      }
   }

   /** Updates the rotation of the player to match the cursor position */
   public static updateRotation(): void {
      if (Player.instance === null || cursorX === null || cursorY === null) return;

      const relativeCursorX = cursorX - halfWindowWidth;
      const relativeCursorY = -cursorY + halfWindowHeight;

      const cursorDirection = Math.atan2(relativeCursorY, relativeCursorX);
      Player.instance.rotation = cursorDirection;
   }

   public static calculateAttackTargets(): ReadonlyArray<Entity> {
      const offset = new Vector(this.ATTACK_OFFSET, Player.instance!.rotation);
      const attackPosition = Player.instance!.position.copy();
      attackPosition.add(offset.convertToPoint());

      const minChunkX = Math.max(Math.min(Math.floor((attackPosition.x - this.ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((attackPosition.x + this.ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((attackPosition.y - this.ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((attackPosition.y + this.ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

      // Find all attacked entities
      const attackedEntities = new Array<Entity>();
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = Game.board.getChunk(chunkX, chunkY);

            for (const entity of chunk.getEntities()) {
               // Skip entities that are already in the array
               if (attackedEntities.includes(entity)) continue;

               const dist = Game.board.calculateDistanceBetweenPointAndEntity(attackPosition, entity);
               if (dist <= Player.ATTACK_TEST_RADIUS) attackedEntities.push(entity);
            }
         }
      }
      
      // Don't attack yourself
      while (true) {
         const idx = attackedEntities.indexOf(this.instance!);
         if (idx !== -1) {
            attackedEntities.splice(idx, 1);
         } else {
            break;
         }
      }

      return attackedEntities;
   }

   public tick(): void {
      if (this === Player.instance) {
         this.detectMovement();
         Player.updateCraftingRecipes();

         Player.tickItems();

         if (this.secondsSinceLastHit !== null) {
            this.secondsSinceLastHit += 1 / SETTINGS.TPS;
         }
      }
   }

   private detectMovement(): void {
      // Get pressed keys
      const wIsPressed = keyIsPressed("w") || keyIsPressed("W") || keyIsPressed("ArrowUp");
      const aIsPressed = keyIsPressed("a") || keyIsPressed("A") || keyIsPressed("ArrowLeft");
      const sIsPressed = keyIsPressed("s") || keyIsPressed("S") || keyIsPressed("ArrowDown");
      const dIsPressed = keyIsPressed("d") || keyIsPressed("D") || keyIsPressed("ArrowRight");

      this.updateMovement(wIsPressed, aIsPressed, sIsPressed, dIsPressed);
   }

   private updateMovement(wIsPressed: boolean, aIsPressed: boolean, sIsPressed: boolean, dIsPressed: boolean): void {
      const hash = (wIsPressed ? 1 : 0) + (aIsPressed ? 2 : 0) + (sIsPressed ? 4 : 0) + (dIsPressed ? 8 : 0)
      
      // Update rotation
      let rotation!: number | null;
      switch (hash) {
         case 0:  rotation = null;          break;
         case 1:  rotation = Math.PI / 2;   break;
         case 2:  rotation = Math.PI;       break;
         case 3:  rotation = Math.PI * 3/4; break;
         case 4:  rotation = Math.PI * 3/2; break;
         case 5:  rotation = null;          break;
         case 6:  rotation = Math.PI * 5/4; break;
         case 7:  rotation = Math.PI;       break;
         case 8:  rotation = 0;             break;
         case 9:  rotation = Math.PI / 4;   break;
         case 10: rotation = null;          break;
         case 11: rotation = Math.PI / 2;   break;
         case 12: rotation = Math.PI * 7/4; break;
         case 13: rotation = 0;             break;
         case 14: rotation = Math.PI * 3/2; break;
         case 15: rotation = null;          break;
      }

      if (rotation !== null) {
         this.acceleration = new Vector(Player.ACCELERATION, rotation);
         this.terminalVelocity = Player.TERMINAL_VELOCITY;
      } else {
         this.acceleration = null;
      }
   }

   public static setHealth(health: number): void {
      const healthHasChanged = health !== this.health;

      this.health = health;

      if (healthHasChanged && typeof updateHealthBar !== "undefined") {
         updateHealthBar(this.health);
      }

      if (this.health <= 0) {
         this.die();
      }
   }

   private static die(): void {
      if (this.instance === null) return;
      
      gameScreenSetIsDead(true);

      // Remove the player from the game
      delete Game.board.entities[this.instance.id];
      this.instance = null;
   }

   /** Registers a server-side hit for the client */
   public static registerHit(hitData: HitData) {
      if (this.instance === null) return;

      // Add force
      if (hitData.angleFromDamageSource !== null) {
         if (this.instance.velocity !== null) {
            this.instance.velocity.magnitude *= 0.5;
         }

         const pushForce = new Vector(200, hitData.angleFromDamageSource);
         if (this.instance.velocity !== null) {
            this.instance.velocity.add(pushForce);
         } else {
            this.instance.velocity = pushForce;
         }
      }
   }

   public static setCraftingOutputItem(craftingOutputItem: Item | null): void {
      this.craftingOutputItem = craftingOutputItem;
      if (typeof setCraftingMenuOutputItem !== "undefined") {
         setCraftingMenuOutputItem(this.craftingOutputItem);
      }
   }

   public static setHeldItem(heldItem: Item | null): void {
      const previousHeldItem = this.heldItem;
      this.heldItem = heldItem;
      if (typeof setHeldItemVisual !== "undefined" && this.heldItem !== previousHeldItem) {
         setHeldItemVisual(this.heldItem);
      }
   }

   private static selectItemSlot(itemSlot: number): void {
      // Deselect any previous item
      if (this.hotbarInventory.hasOwnProperty(this.selectedHotbarItemSlot)) {
         this.hotbarInventory[this.selectedHotbarItemSlot]!.deselect();
      }

      this.selectedHotbarItemSlot = itemSlot;

      // Select any new item
      if (this.hotbarInventory.hasOwnProperty(itemSlot)) {
         this.hotbarInventory[itemSlot]!.select();
      }
      
      setHotbarSelectedItemSlot(itemSlot);
   }

   public static updateHotbar(): void {
      if (typeof setHotbarInventory !== "undefined") {
         const hotbarInventoryCopy = Object.assign({}, this.hotbarInventory);
         setHotbarInventory(hotbarInventoryCopy);
      }
   }

   private static createKeyListeners(): void {
      for (let itemSlot = 1; itemSlot <= SETTINGS.PLAYER_HOTBAR_SIZE; itemSlot++) {
         addKeyListener(itemSlot.toString(), () => this.selectItemSlot(itemSlot));
      }
   }

   private static updateCraftingRecipes(): void {
      // 
      // Find which crafting recipes are available to the player
      // 

      let availableCraftingRecipes: Array<CraftingRecipe> = CRAFTING_RECIPE_RECORD.hand.slice();
      let availableCraftingStations = new Set<CraftingStation>();
      
      const minChunkX = Math.max(Math.min(Math.floor((this.instance!.position.x - this.MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((this.instance!.position.x + this.MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((this.instance!.position.y - this.MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((this.instance!.position.y + this.MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = Game.board.getChunk(chunkX, chunkY);
            for (const entity of chunk.getEntities()) {
               const distance = this.instance!.position.calculateDistanceBetween(entity.position);
               if (distance <= Player.MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) {
                  switch (entity.type) {
                     case "workbench": {
                        if (!availableCraftingStations.has("workbench")) {
                           availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD.workbench.slice());
                           availableCraftingStations.add("workbench");
                        }
                     }
                  }
               }
            }
         }
      }

      // Send that information to the crafting menu
      setCraftingMenuAvailableRecipes(availableCraftingRecipes);
      setCraftingMenuAvailableCraftingStations(availableCraftingStations);
   }

   public static getNumItemType(itemType: ItemType): number {
      let numItems = 0;
      for (const item of Object.values(this.hotbarInventory)) {
         if (item.type === itemType) {
            numItems += item.count;
         }
      }

      return numItems;
   }

   private static createItemUseListeners(): void {
      document.addEventListener("mousedown", e => {
         // Only attempt to use an item if the game canvas was clicked
         if ((e.target as HTMLElement).id !== "game-canvas") {
            return;
         }

         const selectedItem = this.hotbarInventory[this.selectedHotbarItemSlot];

         // Attack with an empty hand
         if (typeof selectedItem === "undefined") {
            if (e.button === 0) {
               this.attackWithHand();
            }
            return;
         }

         if (e.button === 0) {
            // Left click
            selectedItem.onLeftClick();
         } else if (e.button === 2) {
            // Right click
            if (typeof selectedItem.onRightMouseButtonDown !== "undefined") {
               selectedItem.onRightMouseButtonDown();
            }
         }
      });

      document.addEventListener("mouseup", e => {
         // Only attempt to use an item if the game canvas was clicked
         if ((e.target as HTMLElement).id !== "game-canvas") {
            return;
         }

         const selectedItem = this.hotbarInventory[this.selectedHotbarItemSlot];

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
         if ((e.target as HTMLElement).id === "game-canvas") {
            e.preventDefault();
         } else {
            clearPressedKeys();
         }
      });
   }

   private static attackWithHand(): void {
      if (this.instance === null) return;
      
      const attackTargets = this.calculateAttackTargets();
      const attackPacket: AttackPacket = {
         itemSlot: this.selectedHotbarItemSlot,
         attackDirection: this.instance.rotation,
         targetEntities: attackTargets.map(entity => entity.id)
      };
      Client.sendAttackPacket(attackPacket);
   }

   public static getSelectedItem(): Item | null {
      if (this.instance === null) return null;

      const item = this.hotbarInventory[this.selectedHotbarItemSlot];
      if (typeof item === "undefined") return null;
      return item;
   }

   private static tickItems(): void {
      for (const item of Object.values(this.hotbarInventory)) {
         if (typeof item.tick !== "undefined") {
            item.tick();
         }
      }
   }
}

export default Player;