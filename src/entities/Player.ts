import { CraftingRecipe, CraftingStation, CRAFTING_RECIPES, HitboxType, HitData, Point, SETTINGS, Vector, clampToBoardDimensions, TribeType } from "webgl-test-shared";
import Camera from "../Camera";
import { setCraftingMenuAvailableRecipes, setCraftingMenuAvailableCraftingStations } from "../components/game/menus/CraftingMenu";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Hitbox from "../hitboxes/Hitbox";
import Item, { ItemSlot } from "../items/Item";
import RenderPart from "../render-parts/RenderPart";
import { halfWindowHeight, halfWindowWidth } from "../webgl";
import GameObject from "../GameObject";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import DroppedItem from "../items/DroppedItem";
import { Tile } from "../Tile";
import TribeMember from "./TribeMember";

/** Maximum distance from a crafting station which will allow its recipes to be crafted. */
const MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION = 250;

const CRAFTING_RECIPE_RECORD: Record<CraftingStation | "hand", Array<CraftingRecipe>> = {
   hand: [],
   workbench: [],
   slime: []
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
                     break;
                  }
                  case "slime": {
                     if (!availableCraftingStations.has("slime")) {
                        availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD.slime.slice());
                        availableCraftingStations.add("slime");
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
   if (Player.instance === null || Game.definiteGameState.hotbar === null) return null;

   const item: Item | undefined = Game.definiteGameState.hotbar.itemSlots[Game.latencyGameState.selectedHotbarItemSlot];
   return item || null;
}

/** As the player time since hit is not updated from  */
export function tickPlayerInstanceTimeSinceHit(): void {
   if (Player.instance === null) return;

   if (Player.instance.secondsSinceLastHit !== null) {
      Player.instance.secondsSinceLastHit += 1 / SETTINGS.TPS;
   }
}

enum TileCollisionAxis {
   none = 0,
   x = 1,
   y = 2,
   diagonal = 3
}

class Player extends TribeMember {
   public static readonly MAX_HEALTH = 20;

   private static readonly RADIUS = 32;
   
   /** The player entity associated with the current player. */
   public static instance: Player | null = null;

   public readonly type = "player";
   
   public readonly username: string;

   public static readonly HITBOXES: ReadonlySet<Hitbox<HitboxType>> = new Set<Hitbox<HitboxType>>([
      new CircularHitbox({
         type: "circular",
         radius: Player.RADIUS
      })
   ]);

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeType: TribeType, username: string) {
      super(position, hitboxes, id, secondsSinceLastHit, tribeType);

      this.attachRenderParts([
         new RenderPart({
            width: 64,
            height: 64,
            textureSource: "entities/human/human1.png",
            zIndex: 0
         }, this)
      ]);

      this.username = username;
   }

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
      if (hitData.hitDirection !== null) {
         if (this.instance.velocity !== null) {
            this.instance.velocity.magnitude *= 0.5;
         }

         const pushForce = new Vector(hitData.knockback, hitData.hitDirection);
         if (this.instance.velocity !== null) {
            this.instance.velocity.add(pushForce);
         } else {
            this.instance.velocity = pushForce;
         }
      }
   }

   public static resolveCollisions(): void {
      this.resolveWallTileCollisions();
      this.resolveWallCollisions();
      this.resolveGameObjectCollisions();
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

      this.stopXVelocity();
   }

   private static resolveYAxisTileCollision(tile: Tile): void {
      const yDist = Player.instance!.position.y - tile.y * SETTINGS.TILE_SIZE;
      const yDir = yDist >= 0 ? 1 : -1;
      Player.instance!.position.y = tile.y * SETTINGS.TILE_SIZE + (0.5 + 0.5 * yDir) * SETTINGS.TILE_SIZE + Player.RADIUS * yDir;

      this.stopYVelocity();
   }

   private static resolveDiagonalTileCollision(tile: Tile): void {
      const xDist = Player.instance!.position.x - tile.x * SETTINGS.TILE_SIZE;
      const yDist = Player.instance!.position.y - tile.y * SETTINGS.TILE_SIZE;

      const xDir = xDist >= 0 ? 1 : -1;
      const yDir = yDist >= 0 ? 1 : -1;

      const xDistFromEdge = Math.abs(xDist - SETTINGS.TILE_SIZE/2);
      const yDistFromEdge = Math.abs(yDist - SETTINGS.TILE_SIZE/2);

      const moveAxis: "x" | "y" = yDistFromEdge >= xDistFromEdge ? "y" : "x";

      if (moveAxis === "x") {
         Player.instance!.position.x = (tile.x + 0.5 + 0.5 * xDir) * SETTINGS.TILE_SIZE + Player.RADIUS * xDir;
         this.stopXVelocity();
      } else {
         Player.instance!.position.y = (tile.y + 0.5 + 0.5 * yDir) * SETTINGS.TILE_SIZE + Player.RADIUS * yDir;
         this.stopYVelocity();
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
            const tile = Game.board.getTile(tileX, tileY);
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
                     this.resolveDiagonalTileCollision(tile);
                     break;
                  }
               }
            }
         }
      }
   }

   private static stopXVelocity(): void {
      if (Player.instance!.velocity !== null) {
         const pointVelocity = Player.instance!.velocity.convertToPoint();
         pointVelocity.x = 0;
         Player.instance!.velocity = pointVelocity.convertToVector();
      }
   }

   private static stopYVelocity(): void {
      if (Player.instance!.velocity !== null) {
         const pointVelocity = Player.instance!.velocity.convertToPoint();
         pointVelocity.y = 0;
         Player.instance!.velocity = pointVelocity.convertToVector();
      }
   }
   
   private static resolveWallCollisions(): void {
      const boardUnits = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE;

      for (const hitbox of Player.instance!.hitboxes) {
         // Left wall
         if (hitbox.bounds[0] < 0) {
            this.stopXVelocity();
            Player.instance!.position.x -= hitbox.bounds[0];
            // Right wall
         } else if (hitbox.bounds[1] > boardUnits) {
            Player.instance!.position.x -= hitbox.bounds[1] - boardUnits;
            this.stopXVelocity();
         }
         
         // Bottom wall
         if (hitbox.bounds[2] < 0) {
            Player.instance!.position.y -= hitbox.bounds[2];
            this.stopYVelocity();
            // Top wall
         } else if (hitbox.bounds[3] > boardUnits) {
            Player.instance!.position.y -= hitbox.bounds[3] - boardUnits;
            this.stopYVelocity();
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
         const force = SETTINGS.ENTITY_PUSH_FORCE / SETTINGS.TPS * forceMultiplier;
         const angle = Player.instance.position.calculateAngleBetween(gameObject.position) + Math.PI;

         // No need to apply force to other object as they will do it themselves
         const pushForce = new Vector(force, angle);
         if (Player.instance.velocity !== null) {
            Player.instance.velocity.add(pushForce);
         } else {
            Player.instance.velocity = pushForce;
         }
      }
   }

   private static getCollidingGameObjects(): ReadonlyArray<GameObject> {
      if (Player.instance === null) throw new Error();
      
      const collidingGameObjects = new Array<GameObject>();

      for (const chunk of Player.instance.chunks) {
         gameObjectLoop: for (const gameObject of chunk.getGameObjects()) {
            if (gameObject === Player.instance) continue;

            for (const hitbox of Player.instance.hitboxes) {
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
         switch (hitbox.info.type) {
            case "circular": {
               maxDist += hitbox.info.radius;
               break;
            }
            case "rectangular": {
               maxDist += (hitbox as RectangularHitbox).halfDiagonalLength;
               break;
            }
         }
      }

      // Account for the other object's hitboxes
      for (const hitbox of gameObject.hitboxes) {
         switch (hitbox.info.type) {
            case "circular": {
               maxDist += hitbox.info.radius;
               break;
            }
            case "rectangular": {
               maxDist += (hitbox as RectangularHitbox).halfDiagonalLength;
               break;
            }
         }
      }
      
      return maxDist;
   }
}

export default Player;