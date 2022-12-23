import { AttackPacket, canCraftRecipe, CraftingRecipe, CraftingStation, CRAFTING_RECIPES, HitboxType, HitData, ItemType, Point, SETTINGS, Vector } from "webgl-test-shared";
import Camera from "../Camera";
import Client from "../client/Client";
import { updateHealthBar } from "../components/game/HealthBar";
import { setHeldItemVisual } from "../components/game/HeldItem";
import { setHotbarInventory, setHotbarSelectedItemSlot } from "../components/game/Hotbar";
import { setCraftingMenuAvailableRecipes, setCraftingMenuCraftableRecipes, setCraftingMenuOutputItem } from "../components/game/menus/CraftingMenu";
import Game from "../Game";
import Hitbox from "../hitboxes/Hitbox";
import Item from "../Item";
import { addKeyListener, keyIsPressed } from "../keyboard-input";
import RenderPart from "../render-parts/RenderPart";
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

const inventoriesAreTheSame = (inventory1: Inventory, inventory2: Inventory, inventorySize: number): boolean => {
   for (let itemSlot = 1; itemSlot <= inventorySize; itemSlot++) {
      const item1 = inventory1[itemSlot];
      const item2 = inventory2[itemSlot];

      const item1IsUndefined = typeof item1 === "undefined";
      const item2IsUndefined = typeof item2 === "undefined";

      // If one slot is empty and the other isn't, the inventories aren't the same
      if ((!item1IsUndefined && item2IsUndefined) || (item1IsUndefined && !item2IsUndefined)) {
         return false;
      }

      if (item1IsUndefined || item2IsUndefined) {
         continue;
      }

      if (item1.type !== item2.type || item1.count !== item2.count) {
         return false;
      }
   }

   return true;
}

class Player extends Entity {
   private static readonly MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION: number = 250;
   
   public static instance: Player | null = null;

   public static hotbarInventory: Inventory = {};
   public static selectedHotbarItemSlot: number;

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

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, displayName: string) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.addRenderParts([
         new RenderPart({
            width: 64,
            height: 64,
            textureSource: "player.png"
         })
      ]);

      this.displayName = displayName;

      if (Player.instance === null) {
         Player.instance = this;

         Camera.position = this.position;

         Player.createKeyListeners();
      }
   }

   public static attack(): void {
      if (typeof this.instance === "undefined") return;

      const targets = this.getAttackTargets();
      if (targets.length > 0) {
         // Send attack packet
         const attackPacket: AttackPacket = {
            targetEntities: targets.map(target => target.id),
            heldItem: null
         }
         Client.sendAttackPacket(attackPacket);
      }
   }

   private static getAttackTargets(): ReadonlyArray<Entity> {
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
         this.rotation = rotation;
      } else {
          this.acceleration = null;
         this.isMoving = false;
         return;
      }

      this.acceleration = new Vector(Player.ACCELERATION, this.rotation);
      this.terminalVelocity = Player.TERMINAL_VELOCITY;
      this.isMoving = true;
   }

   /** Registers a server-side hit for the client */
   public static registerHit(hitData: HitData) {
      if (this.instance === null) return;

      this.health -= hitData.damage;
      
      updateHealthBar(this.health);

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

   public static setHotbarInventory(inventory: Inventory): void {
      const previousHotbar = this.hotbarInventory;
      this.hotbarInventory = inventory;
      if (typeof setHotbarInventory !== "undefined" && !inventoriesAreTheSame(this.hotbarInventory, previousHotbar, SETTINGS.PLAYER_HOTBAR_SIZE)) {
         setHotbarInventory(this.hotbarInventory);
      }
   }

   public static setCraftingOutputItem(craftingOutputItem: Item | null): void {
      this.craftingOutputItem = craftingOutputItem;
      // console.log(craftingOutputItem);
      if (typeof setCraftingMenuOutputItem !== "undefined") {
         // console.log(craftingOutputItem);
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
      this.selectedHotbarItemSlot = itemSlot;
      setHotbarSelectedItemSlot(itemSlot);
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
               switch (entity.type) {
                  case "workbench": {
                     if (!availableCraftingStations.has("workbench")) {
                        availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD.workbench.slice());
                     }
                  }
               }
            }
         }
      }

      // Send that information to the crafting menu
      setCraftingMenuAvailableRecipes(availableCraftingRecipes);

      // 
      // Find which of the available recipes can be crafted
      // 

      const craftableRecipes = new Array<CraftingRecipe>();
      for (const recipe of availableCraftingRecipes) {
         if (canCraftRecipe(this.hotbarInventory, recipe, SETTINGS.PLAYER_HOTBAR_SIZE)) {
            craftableRecipes.push(recipe);
         }
      }

      setCraftingMenuCraftableRecipes(craftableRecipes);
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
}

export default Player;