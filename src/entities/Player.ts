import { CraftingRecipe, CraftingStation, CRAFTING_RECIPES, HitData, Point, SETTINGS, clampToBoardDimensions, TribeType, ItemType, InventoryData, TribeMemberAction, TileType, EntityType, ItemSlot, Item, TRIBE_INFO_RECORD } from "webgl-test-shared";
import Camera from "../Camera";
import { setCraftingMenuAvailableRecipes, setCraftingMenuAvailableCraftingStations } from "../components/game/menus/CraftingMenu";
import CircularHitbox from "../hitboxes/CircularHitbox";
import { halfWindowHeight, halfWindowWidth } from "../webgl";
import GameObject from "../GameObject";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import DroppedItem from "../items/DroppedItem";
import { Tile } from "../Tile";
import TribeMember from "./TribeMember";
import Board from "../Board";
import { definiteGameState, latencyGameState } from "../game-state/game-states";
import { createFootprintParticle } from "../generic-particles";
import { keyIsPressed } from "../keyboard-input";

/** Maximum distance from a crafting station which will allow its recipes to be crafted. */
const MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION = 250;

const CRAFTING_RECIPE_RECORD: Record<CraftingStation | "hand", Array<CraftingRecipe>> = {
   hand: [],
   [CraftingStation.workbench]: [],
   [CraftingStation.slime]: [],
   [CraftingStation.water]: []
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

   if (Player.instance.tile.type === TileType.water) {
      availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD[CraftingStation.water].slice());
      availableCraftingStations.add(CraftingStation.water);
   }
   
   const minChunkX = Math.max(Math.min(Math.floor((Player.instance!.position.x - MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((Player.instance!.position.x + MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((Player.instance!.position.y - MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((Player.instance!.position.y + MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getEntities()) {
            const distance = Player.instance!.position.calculateDistanceBetween(entity.position);
            if (distance <= MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) {
               switch (entity.type) {
                  case EntityType.workbench: {
                     if (!availableCraftingStations.has(CraftingStation.workbench)) {
                        availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD[CraftingStation.workbench].slice());
                        availableCraftingStations.add(CraftingStation.workbench);
                     }
                     break;
                  }
                  case EntityType.slime: {
                     if (!availableCraftingStations.has(CraftingStation.slime)) {
                        availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD[CraftingStation.slime].slice());
                        availableCraftingStations.add(CraftingStation.slime);
                     }
                     break;
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
   if (Player.instance === null || definiteGameState.hotbar === null) return null;

   const item: Item | undefined = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   return item || null;
}

enum TileCollisionAxis {
   none = 0,
   x = 1,
   y = 2,
   diagonal = 3
}

class Player extends TribeMember {
   /** The player entity associated with the current player. */
   public static instance: Player | null = null;

   public readonly type = EntityType.player;
   
   private numFootstepsTaken = 0;
   private distanceTracker = 0;
   
   public readonly username: string;

   constructor(position: Point, id: number, renderDepth: number, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, activeItem: ItemType | null, action: TribeMemberAction, foodEatingType: ItemType | -1, lastActionTicks: number, hasFrostShield: boolean, warPaintType: number, username: string) {
      super(position, id, EntityType.player, renderDepth, tribeID, tribeType, armourSlotInventory, backpackSlotInventory, backpackInventory, activeItem, action, foodEatingType, lastActionTicks, hasFrostShield, warPaintType);

      this.username = username;
   }

   public static setInstancePlayer(player: Player): void {
      if (Player.instance !== null) {
         throw new Error("Tried to create a new player main instance when one already existed!");
      }

      Player.instance = player;

      Camera.position = player.position;

      const maxHealth = TRIBE_INFO_RECORD[player.tribeType].maxHealthPlayer;
      definiteGameState.setPlayerHealth(maxHealth);
      definiteGameState.hotbar = {
         itemSlots: {},
         width: SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE,
         height: 1,
         inventoryName: "hotbar"
      };
   }

   public tick(): void {
      super.tick();

      // Footsteps
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver()) {
         if (Board.tickIntervalHasPassed(0.2)) {
            createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 4);
            this.numFootstepsTaken++;
         }
      }
      this.distanceTracker += this.velocity.length() / SETTINGS.TPS;
      if (this.distanceTracker > 64) {
         this.distanceTracker -= 64;
         this.createFootstepSound();
      }
   }

   protected onHit(hitData: HitData): void {
      super.onHit(hitData);
      
      // Knockback
      if (this === Player.instance && hitData.angleFromAttacker !== null) {
         this.velocity.x *= 0.5;
         this.velocity.y *= 0.5;

         this.velocity.x += hitData.knockback * Math.sin(hitData.angleFromAttacker);
         this.velocity.y += hitData.knockback * Math.cos(hitData.angleFromAttacker);
      }
   }

   public static resolveCollisions(): void {
      // Don't resolve wall tile collisions in lightspeed mode
      if (!keyIsPressed("l")) {
         this.resolveWallTileCollisions();
      }
      this.resolveWallCollisions();
      this.resolveGameObjectCollisions();

      // @Cleanup: We call resolveWallCollisions 2 calls before this, is this really necessary??
      // Sometimes the player can get pushed out of the border by collisions (especially when clipping inside walls), so bring them back into the world when that happens
      Player.instance!.resolveBorderCollisions();
   }

   private static checkForTileCollision(tile: Tile): TileCollisionAxis {
      // Get the distance between the player's position and the center of the tile
      const xDist = Math.abs(Player.instance!.position.x - (tile.x + 0.5) * SETTINGS.TILE_SIZE);
      const yDist = Math.abs(Player.instance!.position.y - (tile.y + 0.5) * SETTINGS.TILE_SIZE);

      if (xDist <= Player.RADIUS) {
         return TileCollisionAxis.y;
      }
      if (yDist <= Player.RADIUS) {
         return TileCollisionAxis.x;
      }

      const cornerDistance = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));

      if (cornerDistance <= Math.sqrt(Math.pow(SETTINGS.TILE_SIZE, 2) / 2) + Player.RADIUS) {
         return TileCollisionAxis.diagonal;
      }

      return TileCollisionAxis.none;
   }

   private static resolveXAxisTileCollision(tile: Tile): void {
      const xDist = Player.instance!.position.x - tile.x * SETTINGS.TILE_SIZE;
      const xDir = xDist >= 0 ? 1 : -1;
      Player.instance!.position.x = tile.x * SETTINGS.TILE_SIZE + (0.5 + 0.5 * xDir) * SETTINGS.TILE_SIZE + Player.RADIUS * xDir;
      Player.instance!.velocity.x = 0;
   }

   private static resolveYAxisTileCollision(tile: Tile): void {
      const yDist = Player.instance!.position.y - tile.y * SETTINGS.TILE_SIZE;
      const yDir = yDist >= 0 ? 1 : -1;
      Player.instance!.position.y = tile.y * SETTINGS.TILE_SIZE + (0.5 + 0.5 * yDir) * SETTINGS.TILE_SIZE + Player.RADIUS * yDir;
      Player.instance!.velocity.y = 0;
   }

   private static resolveDiagonalTileCollision(tile: Tile, hitbox: CircularHitbox): void {
      const xDir = Player.instance!.position.x >= (tile.x + 0.5) * SETTINGS.TILE_SIZE ? 1 : -1;
      const yDir = Player.instance!.position.y >= (tile.y + 0.5) * SETTINGS.TILE_SIZE ? 1 : -1;

      const tileVertexX = xDir === 1 ? tile.x + 1 : tile.x;
      const tileVertexY = yDir === 1 ? tile.y + 1 : tile.y;
      
      const xDistFromTileEdge = Player.instance!.position.x - tileVertexX * SETTINGS.TILE_SIZE;
      const yDistFromTileEdge = Player.instance!.position.y - tileVertexY * SETTINGS.TILE_SIZE;
      
      const xDistFromCenter = Math.abs(Player.instance!.position.x - (tile.x + 0.5) * SETTINGS.TILE_SIZE);
      const yDistFromCenter = Math.abs(Player.instance!.position.y - (tile.y + 0.5) * SETTINGS.TILE_SIZE);

      const moveAxis: "x" | "y" = xDistFromCenter >= yDistFromCenter ? "x" : "y";
      if (moveAxis === "x") {
         const collisionXDist = Math.sqrt(Math.pow(hitbox.radius, 2) - Math.pow(tileVertexY * SETTINGS.TILE_SIZE - Player.instance!.position.y, 2));
         const amountInside = collisionXDist - Math.abs(xDistFromTileEdge);
         Player.instance!.position.x += amountInside * xDir;
         Player.instance!.velocity.x = 0;
      } else {
         const collisionYDist = Math.sqrt(Math.pow(hitbox.radius, 2) - Math.pow(tileVertexX * SETTINGS.TILE_SIZE - Player.instance!.position.x, 2));
         const amountInside = collisionYDist - Math.abs(yDistFromTileEdge);
         Player.instance!.position.y += amountInside * yDir;
         Player.instance!.velocity.y = 0;
      }
   }

   private static resolveWallTileCollisions(): void {
      if (Player.instance === null) return;
      
      const minTileX = clampToBoardDimensions(Math.floor((Player.instance.position.x - Player.RADIUS) / SETTINGS.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((Player.instance.position.x + Player.RADIUS) / SETTINGS.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((Player.instance.position.y - Player.RADIUS) / SETTINGS.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((Player.instance.position.y + Player.RADIUS) / SETTINGS.TILE_SIZE));

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            const tile = Board.getTile(tileX, tileY);
            if (tile.isWall) {
               const collisionAxis = this.checkForTileCollision(tile);
               switch (collisionAxis) {
                  case TileCollisionAxis.x: {
                     this.resolveXAxisTileCollision(tile);
                     break;
                  }
                  case TileCollisionAxis.y: {
                     this.resolveYAxisTileCollision(tile);
                     break;
                  }
                  case TileCollisionAxis.diagonal: {
                     this.resolveDiagonalTileCollision(tile, Array.from(Player.instance.hitboxes)[0] as CircularHitbox);
                     break;
                  }
               }
            }
         }
      }
   }
   
   // @Cleanup: rename, too similar to wall tiles
   private static resolveWallCollisions(): void {
      const boardUnits = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE;

      for (const hitbox of Player.instance!.hitboxes) {
         // Left wall
         if (hitbox.bounds[0] < 0) {
            Player.instance!.velocity.x = 0;
            Player.instance!.position.x -= hitbox.bounds[0];
            // Right wall
         } else if (hitbox.bounds[1] > boardUnits) {
            Player.instance!.position.x -= hitbox.bounds[1] - boardUnits;
            Player.instance!.velocity.x = 0;
         }
         
         // Bottom wall
         if (hitbox.bounds[2] < 0) {
            Player.instance!.position.y -= hitbox.bounds[2];
            Player.instance!.velocity.y = 0;
            // Top wall
         } else if (hitbox.bounds[3] > boardUnits) {
            Player.instance!.position.y -= hitbox.bounds[3] - boardUnits;
            Player.instance!.velocity.y = 0;
         }
      }
   }
   
   private static resolveGameObjectCollisions(): void {
      if (Player.instance === null) throw new Error();
      
      const collidingEntities = this.getCollidingGameObjects();

      for (const gameObject of collidingEntities) {
         if (gameObject instanceof DroppedItem) {
            continue;
         }
         
         // If the two entities are exactly on top of each other, don't do anything
         if (gameObject.position.x === Player.instance.position.x && gameObject.position.y === Player.instance.position.y) {
            continue;
         }

         // Calculate the force of the push
         // Force gets greater the closer together the entities are
         const distanceBetweenEntities = Player.instance.position.calculateDistanceBetween(gameObject.position);
         const maxDistanceBetweenEntities = this.calculateMaxDistanceFromGameObject(gameObject);
         const dist = Math.max(distanceBetweenEntities / maxDistanceBetweenEntities, 0.1);
         let forceMultiplier = 1 / dist;

         // Push both entities away from each other
         const force = SETTINGS.ENTITY_PUSH_FORCE / SETTINGS.TPS * forceMultiplier * gameObject.mass / Player.instance.mass;
         const angle = Player.instance.position.calculateAngleBetween(gameObject.position) + Math.PI;

         // No need to apply force to other object as they will do it themselves
         Player.instance.velocity.x += force * Math.sin(angle);
         Player.instance.velocity.y += force * Math.cos(angle);
      }
   }

   private static getCollidingGameObjects(): ReadonlyArray<GameObject> {
      const collidingGameObjects = new Array<GameObject>();

      for (const chunk of Player.instance!.chunks) {
         gameObjectLoop: for (const gameObject of chunk.getGameObjects()) {
            if (gameObject === Player.instance) continue;

            for (const hitbox of Player.instance!.hitboxes) {
               for (const otherHitbox of gameObject.hitboxes) {
                  if (hitbox.isColliding(otherHitbox)) {
                     collidingGameObjects.push(gameObject);
                     continue gameObjectLoop;
                  }
               }
            }
         }
      }

      return collidingGameObjects;
   }

   private static calculateMaxDistanceFromGameObject(gameObject: GameObject): number {
      let maxDist = 0;

      // Account for this object's hitboxes
      for (const hitbox of Player.instance!.hitboxes) {
         if (hitbox.hasOwnProperty("radius")) {
            // Circular
            maxDist += (hitbox as CircularHitbox).radius;
         } else {
            // Rectangular
            maxDist += (hitbox as RectangularHitbox).halfDiagonalLength;
         }
      }

      // Account for the other object's hitboxes
      for (const hitbox of gameObject.hitboxes) {
         if (hitbox.hasOwnProperty("radius")) {
            // Circular
            maxDist += (hitbox as CircularHitbox).radius;
         } else {
            // Rectangular
            maxDist += (hitbox as RectangularHitbox).halfDiagonalLength;
         }
      }
      
      return maxDist;
   }

   public static createNewPlayerHitbox(): CircularHitbox {
      const hitbox = new CircularHitbox(Player.RADIUS);
      return hitbox;
   }
}

export default Player;