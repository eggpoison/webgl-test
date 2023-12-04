import { EntityType, InventoryData, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import CookingEntity from "./CookingEntity";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import Board, { Light } from "../Board";
import { createEmberParticle, createSmokeParticle } from "../generic-particles";

class Campfire extends CookingEntity {
   public static readonly SIZE = 104;

   public type = EntityType.campfire;

   private readonly light: Light;

   constructor(position: Point, id: number, renderDepth: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number, isCooking: boolean) {
      super(position, id, renderDepth, fuelInventory, ingredientInventory, outputInventory, heatingProgress, isCooking);

      this.attachRenderPart(
         new RenderPart(
            this,
            Campfire.SIZE,
            Campfire.SIZE,
            getGameObjectTextureArrayIndex("entities/campfire/campfire.png"),
            0,
            0
         )
      );

      this.light = {
         position: this.position,
         strength: 3.5,
         radius: 40
      };
      Board.lights.push(this.light);
   }

   public tick(): void {
      super.tick();

      if (Board.tickIntervalHasPassed(0.15)) {
         this.light.radius = 40 + randFloat(-7, 7);
      }

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

   public onRemove(): void {
      const idx = Board.lights.indexOf(this.light);
      if (idx !== -1) {
         Board.lights.splice(idx, 1);
      }
   }
}

export default Campfire;