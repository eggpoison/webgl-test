import { EntityType, InventoryData, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import CookingEntity from "./CookingEntity";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import { createEmberParticle, createSmokeParticle } from "../generic-particles";
import Board from "../Board";

class Furnace extends CookingEntity {
   public static readonly SIZE = 80;

   public type: EntityType = "furnace";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number, isCooking: boolean) {
      super(position, hitboxes, id, renderDepth, fuelInventory, ingredientInventory, outputInventory, heatingProgress, isCooking);

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
}

export default Furnace;