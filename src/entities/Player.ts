import { CraftingRecipe, CraftingStation, CRAFTING_RECIPES, HitboxType, HitData, Point, SETTINGS, Vector } from "webgl-test-shared";
import Camera from "../Camera";
import { setCraftingMenuAvailableRecipes, setCraftingMenuAvailableCraftingStations } from "../components/game/menus/CraftingMenu";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Hitbox from "../hitboxes/Hitbox";
import Item, { ItemSlot } from "../items/Item";
import RenderPart from "../render-parts/RenderPart";
import { halfWindowHeight, halfWindowWidth } from "../webgl";
import Entity from "./Entity";

/** Maximum distance from a crafting station which will allow its recipes to be crafted. */
const MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION = 250;

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

/** Updates the rotation of the player to match the cursor position */
export function updatePlayerRotation(cursorX: number, cursorY: number): void {
   if (Player.instance === null || cursorX === null || cursorY === null) return;

   const relativeCursorX = cursorX - halfWindowWidth;
   const relativeCursorY = -cursorY + halfWindowHeight;

   let cursorDirection = Math.atan2(relativeCursorY, relativeCursorX);
   cursorDirection = Math.PI/2 - cursorDirection;
   Player.instance.rotation = cursorDirection;
}

export function updateAvailableCraftingRecipes(): void {
   if (Player.instance === null) return;
   
   // 
   // Find which crafting recipes are available to the player
   // 

   let availableCraftingRecipes: Array<CraftingRecipe> = CRAFTING_RECIPE_RECORD.hand.slice();
   let availableCraftingStations = new Set<CraftingStation>();
   
   const minChunkX = Math.max(Math.min(Math.floor((Player.instance!.position.x - MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((Player.instance!.position.x + MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((Player.instance!.position.y - MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((Player.instance!.position.y + MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Game.board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getEntities()) {
            const distance = Player.instance!.position.calculateDistanceBetween(entity.position);
            if (distance <= MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) {
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

export function getPlayerSelectedItem(): ItemSlot {
   if (Player.instance === null) return null;

   const item: Item | undefined = Game.definiteGameState.hotbarItemSlots[Game.latencyGameState.selectedHotbarItemSlot];
   return item || null;
}

/** As the player time since hit is not updated from  */
export function tickPlayerInstanceTimeSinceHit(): void {
   if (Player.instance === null) return;

   if (Player.instance.secondsSinceLastHit !== null) {
      Player.instance.secondsSinceLastHit += 1 / SETTINGS.TPS;
   }
}

class Player extends Entity {
   public static readonly MAX_HEALTH = 20;
   
   /** The player entity associated with the current player. */
   public static instance: Player | null = null;

   public readonly type = "player";
   
   public readonly username: string;

   public static readonly HITBOXES: ReadonlySet<Hitbox<HitboxType>> = new Set<Hitbox<HitboxType>>([
      new CircularHitbox({
         type: "circular",
         radius: 32
      })
   ]);

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, username: string) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: 64,
            height: 64,
            textureSource: "human/human1.png",
            zIndex: 0
         }, this)
      ]);

      this.username = username;
   }

   // public tick(): void {
   //    this.velocity = new Vector(200, 0);
   // }

   public static setInstancePlayer(player: Player): void {
      if (Player.instance !== null) {
         throw new Error("Tried to create a new player main instance when one already existed!");
      }

      Player.instance = player;

      Camera.position = player.position;

      Game.definiteGameState.setPlayerHealth(Player.MAX_HEALTH);
   }

   /** Registers a server-side hit for the client */
   public static registerHit(hitData: HitData) {
      if (this.instance === null) return;

      // Add force
      if (hitData.knockbackDirection !== null) {
         if (this.instance.velocity !== null) {
            this.instance.velocity.magnitude *= 0.5;
         }

         const pushForce = new Vector(hitData.knockback, hitData.knockbackDirection);
         if (this.instance.velocity !== null) {
            this.instance.velocity.add(pushForce);
         } else {
            this.instance.velocity = pushForce;
         }
      }
   }
}

export default Player;