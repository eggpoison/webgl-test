import { CraftingRecipe, CraftingStation, CRAFTING_RECIPES, HitData, Point, Settings, clampToBoardDimensions, TileType, EntityType, ItemSlot, Item, TRIBE_INFO_RECORD, rotateXAroundPoint, rotateYAroundPoint, DoorToggleType, EntityComponentsData, ServerComponentType, COLLISION_BITS, DEFAULT_COLLISION_MASK, randInt, InventoryUseInfoData, TribeMemberAction } from "webgl-test-shared";
import Camera from "../Camera";
import { setCraftingMenuAvailableRecipes, setCraftingMenuAvailableCraftingStations } from "../components/game/menus/CraftingMenu";
import CircularHitbox from "../hitboxes/CircularHitbox";
import { halfWindowHeight, halfWindowWidth } from "../webgl";
import GameObject from "../GameObject";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import ItemEntity from "../items/ItemEntity";
import TribeMember, { addTribeMemberRenderParts } from "./TribeMember";
import Board from "../Board";
import { definiteGameState, latencyGameState } from "../game-state/game-states";
import { keyIsPressed } from "../keyboard-input";
import Hitbox from "../hitboxes/Hitbox";
import PlayerComponent from "../entity-components/PlayerComponent";
import Game from "../Game";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import InventoryUseComponent from "../entity-components/InventoryUseComponent";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import EquipmentComponent from "../entity-components/EquipmentComponent";

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
   
   const minChunkX = Math.max(Math.min(Math.floor((Player.instance!.position.x - MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((Player.instance!.position.x + MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((Player.instance!.position.y - MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((Player.instance!.position.y + MAX_CRAFTING_DISTANCE_FROM_CRAFTING_STATION) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getGameObjects()) {
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

const entityHasHardCollision = (entity: GameObject, collidingEntity: GameObject): boolean => {
   // Doors have hard collision when closing/closed
   if (entity.type === EntityType.woodenDoor) {
      const doorComponent = entity.getServerComponent(ServerComponentType.door);
      return doorComponent.toggleType === DoorToggleType.close || doorComponent.openProgress === 0;
   }

   // Tunnels have hard collision outside and soft inside
   if (entity.type === EntityType.woodenTunnel) {
      const projX = Math.sin(entity.rotation + Math.PI / 2);
      const projY = Math.cos(entity.rotation + Math.PI / 2);

      const o = 8 - 0.05;
      // const minX = entity.position.x + o * Math.sin(entity.rotation + Math.PI * 3/2);
      // const minY = entity.position.y + o * Math.cos(entity.rotation + Math.PI * 3/2);
      // const maxX = entity.position.x + o * Math.sin(entity.rotation + Math.PI / 2);
      // const maxY = entity.position.y + o * Math.cos(entity.rotation + Math.PI / 2);
      const minX = entity.position.x - o * projX;
      const minY = entity.position.y - o * projY;
      const maxX = entity.position.x + o * projX;
      const maxY = entity.position.y + o * projY;

      const minProj = minX * projX + minY * projY;
      const maxProj = maxX * projX + maxY * projY;

      const centerProj = collidingEntity.position.x * projX + collidingEntity.position.y * projY;
      // console.log(centerProj);
      if (centerProj <= minProj || centerProj >= maxProj) {
         // console.log(minProj, centerProj, maxProj);
         console.warn(Math.random());
      }
      return centerProj <= minProj || centerProj >= maxProj;
   }
   
   return entity.type === EntityType.woodenWall || entity.type === EntityType.woodenEmbrasure;
}

const createInitialInventoryUseInfo = (inventoryName: string): InventoryUseInfoData => {
   return {
      selectedItemSlot: 1,
      inventoryName: inventoryName,
      bowCooldownTicks: 0,
      itemAttackCooldowns: {},
      spearWindupCooldowns: {},
      crossbowLoadProgressRecord: {},
      foodEatingTimer: 0,
      currentAction: TribeMemberAction.none,
      lastAttackTicks: 0,
      lastEatTicks: 0,
      lastBowChargeTicks: 0,
      lastSpearChargeTicks: 0,
      lastBattleaxeChargeTicks: 0,
      lastCrossbowLoadTicks: 0,
      thrownBattleaxeItemID: -1
   }
}

class Player extends TribeMember {
   /** The player entity associated with the current player. */
   public static instance: Player | null = null;
   
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.player>) {
      super(position, id, EntityType.player, ageTicks);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.inventory, new InventoryComponent(this, componentsData[5]));
      this.addServerComponent(ServerComponentType.inventoryUse, new InventoryUseComponent(this, componentsData[6]));
      this.addServerComponent(ServerComponentType.player, new PlayerComponent(this, componentsData[7]));
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.2, 20, 64, 4, 64));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));
      
      addTribeMemberRenderParts(this, componentsData[4]);
   }

   public static createInstancePlayer(position: Point, playerID: number): void {
      if (Player.instance !== null) {
         throw new Error("Tried to create a new player main instance when one already existed!");
      }

      const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;

      const componentsData: EntityComponentsData<EntityType.player> = [
         {},
         {
            health: maxHealth,
            maxHealth: maxHealth
         },
         {
            statusEffects: []
         },
         {
            tribeID: Game.tribe.id
         },
         {
            // @Incomplete: Shouldn't be random, should be sent by the server
            warPaintType: randInt(1, 5)
         },
         {
            inventories: {
               hotbar: {
                  width: Settings.INITIAL_PLAYER_HOTBAR_SIZE,
                  height: 1,
                  itemSlots: {},
                  name: "hotbar"
               },
               armourSlot: {
                  width: 1,
                  height: 1,
                  itemSlots: {},
                  name: "armourSlot"
               },
               gloveSlot: {
                  width: 1,
                  height: 1,
                  itemSlots: {},
                  name: "gloveSlot"
               },
               backpackSlot: {
                  width: 1,
                  height: 1,
                  itemSlots: {},
                  name: "backpackSlot"
               },
               backpack: {
                  width: 1,
                  height: 1,
                  itemSlots: {},
                  name: "backpack"
               },
               offhand: {
                  width: 1,
                  height: 1,
                  itemSlots: {},
                  name: "offhand"
               },
            }
         },
         {
            inventoryUseInfos: [
               createInitialInventoryUseInfo("hotbar"),
               createInitialInventoryUseInfo("offhand")
            ]
         },
         {
            username: definiteGameState.playerUsername
         }
      ];
      
      const player = new Player(position, playerID, 0, componentsData);
      // const player = new Player(position, playerID, 0, null, tribeType, null, TribeMemberAction.none, -1, -99999, -1, null, TribeMemberAction.none, -1, -99999, -1, false, tribeType === TribeType.goblins ? randInt(1, 5) : -1, username);
      player.addCircularHitbox(new CircularHitbox(1, 32));
      player.collisionBit = COLLISION_BITS.default;
      player.collisionMask = DEFAULT_COLLISION_MASK;
      Board.addEntity(player);

      Player.instance = player;

      Camera.position = player.position;

      // @Cleanup: Shouldn't be in this function
      definiteGameState.setPlayerHealth(maxHealth);
      definiteGameState.hotbar = {
         itemSlots: {},
         width: Settings.INITIAL_PLAYER_HOTBAR_SIZE,
         height: 1,
         name: "hotbar"
      };
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

   private static resolveCircleRectangleCollision(circleHitbox: CircularHitbox, rectangularHitbox: RectangularHitbox): void {
      const rectRotation = rectangularHitbox.rotation + rectangularHitbox.externalRotation;
      
      const circlePosX = rotateXAroundPoint(circleHitbox.position.x, circleHitbox.position.y, rectangularHitbox.position.x, rectangularHitbox.position.y, -rectRotation);
      const circlePosY = rotateYAroundPoint(circleHitbox.position.x, circleHitbox.position.y, rectangularHitbox.position.x, rectangularHitbox.position.y, -rectRotation);
      
      const distanceX = circlePosX - rectangularHitbox.position.x;
      const distanceY = circlePosY - rectangularHitbox.position.y;

      const absDistanceX = Math.abs(distanceX);
      const absDistanceY = Math.abs(distanceY);

      // Top and bottom collisions
      if (absDistanceX <= (rectangularHitbox.width/2)) {
         const amountIn = absDistanceY - rectangularHitbox.height/2 - circleHitbox.radius;
         const offsetMagnitude = -amountIn * Math.sign(distanceY);

         Player.instance!.position.x += offsetMagnitude * Math.sin(rectRotation);
         Player.instance!.position.y += offsetMagnitude * Math.cos(rectRotation);

         const direction = rectRotation + Math.PI/2;
         const bx = Math.sin(direction);
         const by = Math.cos(direction);
         const projectionCoeff = (Player.instance!.velocity.x * bx + Player.instance!.velocity.y * by) / (bx * bx + by * by);
         Player.instance!.velocity.x = bx * projectionCoeff;
         Player.instance!.velocity.y = by * projectionCoeff;
         return;
      }

      // Left and right collisions
      if (absDistanceY <= (rectangularHitbox.height/2)) {
         const amountIn = absDistanceX - rectangularHitbox.width/2 - circleHitbox.radius;
         const offsetMagnitude = -amountIn * Math.sign(distanceX);

         Player.instance!.position.x += offsetMagnitude * Math.sin(rectRotation + Math.PI/2);
         Player.instance!.position.y += offsetMagnitude * Math.cos(rectRotation + Math.PI/2);

         const bx = Math.sin(rectRotation);
         const by = Math.cos(rectRotation);
         const projectionCoeff = (Player.instance!.velocity.x * bx + Player.instance!.velocity.y * by) / (bx * bx + by * by);
         Player.instance!.velocity.x = bx * projectionCoeff;
         Player.instance!.velocity.y = by * projectionCoeff;
         return;
      }

      const cornerDistanceSquared = Math.pow(absDistanceX - rectangularHitbox.width/2, 2) + Math.pow(absDistanceY - rectangularHitbox.height/2, 2);
      if (cornerDistanceSquared <= circleHitbox.radius * circleHitbox.radius) {
         // @Cleanup: Whole lot of copy and paste
         const amountInX = absDistanceX - rectangularHitbox.width/2 - circleHitbox.radius;
         const amountInY = absDistanceY - rectangularHitbox.height/2 - circleHitbox.radius;
         if (Math.abs(amountInY) < Math.abs(amountInX)) {
            const closestRectBorderY = circlePosY < rectangularHitbox.position.y ? rectangularHitbox.position.y - rectangularHitbox.height/2 : rectangularHitbox.position.y + rectangularHitbox.height/2;
            
            const closestRectBorderX = circlePosX < rectangularHitbox.position.x ? rectangularHitbox.position.x - rectangularHitbox.width/2 : rectangularHitbox.position.x + rectangularHitbox.width/2;
            const xDistanceFromRectBorder = Math.abs(closestRectBorderX - circlePosX);
            const len = Math.sqrt(circleHitbox.radius * circleHitbox.radius - xDistanceFromRectBorder * xDistanceFromRectBorder);

            const amountIn = Math.abs(closestRectBorderY - (circlePosY - len * Math.sign(distanceY)));
            const offsetMagnitude = amountIn * Math.sign(distanceY);
   
            Player.instance!.position.x += offsetMagnitude * Math.sin(rectRotation);
            Player.instance!.position.y += offsetMagnitude * Math.cos(rectRotation);
   
            const direction = rectRotation + Math.PI/2;
            const bx = Math.sin(direction);
            const by = Math.cos(direction);
            const projectionCoeff = (Player.instance!.velocity.x * bx + Player.instance!.velocity.y * by) / (bx * bx + by * by);
            Player.instance!.velocity.x = bx * projectionCoeff;
            Player.instance!.velocity.y = by * projectionCoeff;
         } else {
            const closestRectBorderX = circlePosX < rectangularHitbox.position.x ? rectangularHitbox.position.x - rectangularHitbox.width/2 : rectangularHitbox.position.x + rectangularHitbox.width/2;
            
            const closestRectBorderY = circlePosY < rectangularHitbox.position.y ? rectangularHitbox.position.y - rectangularHitbox.height/2 : rectangularHitbox.position.y + rectangularHitbox.height/2;
            const yDistanceFromRectBorder = Math.abs(closestRectBorderY - circlePosY);
            const len = Math.sqrt(circleHitbox.radius * circleHitbox.radius - yDistanceFromRectBorder * yDistanceFromRectBorder);

            const amountIn = Math.abs(closestRectBorderX - (circlePosX - len * Math.sign(distanceX)));
            const offsetMagnitude = amountIn * Math.sign(distanceX);
   
            Player.instance!.position.x += offsetMagnitude * Math.sin(rectRotation + Math.PI/2);
            Player.instance!.position.y += offsetMagnitude * Math.cos(rectRotation + Math.PI/2);
   
            const bx = Math.sin(rectRotation);
            const by = Math.cos(rectRotation);
            const projectionCoeff = (Player.instance!.velocity.x * bx + Player.instance!.velocity.y * by) / (bx * bx + by * by);
            Player.instance!.velocity.x = bx * projectionCoeff;
            Player.instance!.velocity.y = by * projectionCoeff;
         }
      }
   }

   private static resolveWallTileCollisions(): void {
      if (Player.instance === null) return;
      
      const minTileX = clampToBoardDimensions(Math.floor((Player.instance.position.x - 32) / Settings.TILE_SIZE));
      const maxTileX = clampToBoardDimensions(Math.floor((Player.instance.position.x + 32) / Settings.TILE_SIZE));
      const minTileY = clampToBoardDimensions(Math.floor((Player.instance.position.y - 32) / Settings.TILE_SIZE));
      const maxTileY = clampToBoardDimensions(Math.floor((Player.instance.position.y + 32) / Settings.TILE_SIZE));

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            const tile = Board.getTile(tileX, tileY);
            if (tile.isWall) {
               const tileHitbox = new RectangularHitbox(1, Settings.TILE_SIZE, Settings.TILE_SIZE);
               tileHitbox.position.x = (tile.x + 0.5) * Settings.TILE_SIZE;
               tileHitbox.position.y = (tile.y + 0.5) * Settings.TILE_SIZE;
               tileHitbox.updateHitboxBounds(0);

               this.resolveCollisionHard(Player.instance.hitboxes[0] as CircularHitbox, tileHitbox);
            }
         }
      }
   }
   
   // @Cleanup: rename, too similar to wall tiles
   private static resolveWallCollisions(): void {
      const boardUnits = Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE;

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

   private static resolveCollisionSoft(playerHitbox: Hitbox, collidingEntity: GameObject, collidingHitbox: Hitbox): void {
      // Calculate the force of the push
      // Force gets greater the closer together the entities are
      const distanceBetweenEntities = Player.instance!.position.calculateDistanceBetween(collidingHitbox.position);
      const maxDistanceBetweenEntities = this.calculateMaxDistanceFromGameObject(collidingEntity);
      const dist = Math.max(distanceBetweenEntities / maxDistanceBetweenEntities, 0.1);
      let forceMultiplier = 1 / dist;

      // Push away
      const force = Settings.ENTITY_PUSH_FORCE / Settings.TPS * forceMultiplier * collidingHitbox.mass / playerHitbox.mass;
      const angle = Player.instance!.position.calculateAngleBetween(collidingHitbox.position) + Math.PI;

      // No need to apply force to other object as they will do it themselves
      Player.instance!.velocity.x += force * Math.sin(angle);
      Player.instance!.velocity.y += force * Math.cos(angle);
   }

   private static resolveCollisionHard(playerHitbox: CircularHitbox, collidingHitbox: Hitbox): void {
      if (collidingHitbox.hasOwnProperty("radius")) {
         return;
      }
      
      this.resolveCircleRectangleCollision(playerHitbox, collidingHitbox as RectangularHitbox);
   }
   
   private static resolveGameObjectCollisions(): void {
      if (Player.instance === null) throw new Error();
      
      const potentialCollidingEntities = this.getPotentialCollidingEntities();

      // @Cleanup: Remove this tag system
      mainLoop:
      for (let i = 0; i < potentialCollidingEntities.length; i++) {
         const entity = potentialCollidingEntities[i];

         if (entity instanceof ItemEntity) {
            continue;
         }
      
         // If the two entities are exactly on top of each other, don't do anything
         if (entity.position.x === Player.instance!.position.x && entity.position.y === Player.instance!.position.y) {
            continue;
         }

         if ((entity.collisionMask & Player.instance.collisionBit) === 0 || (Player.instance.collisionMask & entity.collisionBit) === 0) {
            continue;
         }

         for (const hitbox of Player.instance!.hitboxes) {
            for (const otherHitbox of entity.hitboxes) {
               if (hitbox.isColliding(otherHitbox)) {
                  // Collide
                  if (entityHasHardCollision(entity, Player.instance)) {
                     this.resolveCollisionHard(hitbox as CircularHitbox, otherHitbox);
                  } else {
                     this.resolveCollisionSoft(hitbox, entity, otherHitbox);
                  }
                  continue mainLoop;
               }
            }
         }
      }
   }

   private static getPotentialCollidingEntities(): ReadonlyArray<GameObject> {
      const entities = new Array<GameObject>();

      for (const chunk of Player.instance!.chunks) {
         for (const entity of chunk.getGameObjects()) {
            if (entity !== Player.instance) {
               entities.push(entity);
            }
         }
      }

      return entities;
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
}

export default Player;