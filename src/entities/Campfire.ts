import { EntityType, InventoryData, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import CookingEntity from "./CookingEntity";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Board from "../Board";
import { createEmberParticle, createSmokeParticle } from "../particles";

class Campfire extends CookingEntity {
   public static readonly SIZE = 104;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number, isCooking: boolean) {
      super(position, id, EntityType.campfire, ageTicks, renderDepth, fuelInventory, ingredientInventory, outputInventory, heatingProgress, isCooking);

      this.attachRenderPart(
         new RenderPart(
            this,
            getEntityTextureArrayIndex("entities/campfire/campfire.png"),
            0,
            0
         )
      );
   }

   public tick(): void {
      super.tick();

      // Smoke particles
      if (Board.tickIntervalHasPassed(0.1)) {
         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY);
      }

      // Ember particles
      if (Board.tickIntervalHasPassed(0.05)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createEmberParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(100, 140));
      }
   }
}

export default Campfire;