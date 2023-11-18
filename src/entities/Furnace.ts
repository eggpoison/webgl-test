import { InventoryData, Point, angle, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import CookingEntity from "./CookingEntity";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import { createEmberParticle, createRockParticle, createRockSpeckParticle, createSmokeParticle } from "../generic-particles";
import Board from "../Board";

class Furnace extends CookingEntity {
   public static readonly SIZE = 80;

   public type = "furnace" as const;

   constructor(position: Point, id: number, renderDepth: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number, isCooking: boolean) {
      super(position, id, renderDepth, fuelInventory, ingredientInventory, outputInventory, heatingProgress, isCooking);

      this.attachRenderPart(
         new RenderPart(
            this,
            Furnace.SIZE,
            Furnace.SIZE,
            getGameObjectTextureArrayIndex("entities/furnace/furnace.png"),
            0,
            0
         )
      );
   }

   public tick(): void {
      super.tick();

      if (this.isCooking) {
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
            let spawnPositionX = this.position.x - 30 * Math.sin(this.rotation);
            let spawnPositionY = this.position.y - 30 * Math.cos(this.rotation);

            const spawnOffsetMagnitude = 11 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            createEmberParticle(spawnPositionX, spawnPositionY, this.rotation + Math.PI + randFloat(-0.8, 0.8), randFloat(80, 120));
         }
      }
   }

   protected onHit(): void {
      for (let i = 0; i < 2; i++) {
         let spawnPositionX: number;
         let spawnPositionY: number;
         if (Math.random() < 0.5) {
            spawnPositionX = this.position.x + (Math.random() < 0.5 ? -0.5 : 0.5) * Furnace.SIZE;
            spawnPositionY = this.position.y + randFloat(-0.5, 0.5) * Furnace.SIZE;
         } else {
            spawnPositionX = this.position.x + randFloat(-0.5, 0.5) * Furnace.SIZE;
            spawnPositionY = this.position.y + (Math.random() < 0.5 ? -0.5 : 0.5) * Furnace.SIZE;
         }

         let moveDirection = angle(spawnPositionX - this.position.x, spawnPositionY - this.position.y)
         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125));
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Furnace.SIZE / 2);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 5; i++) {
         const spawnPositionX = this.position.x + randFloat(-0.5, 0.5) * Furnace.SIZE;
         const spawnPositionY = this.position.y + randFloat(-0.5, 0.5) * Furnace.SIZE;

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125));
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Furnace.SIZE / 2);
      }
   }
}

export default Furnace;