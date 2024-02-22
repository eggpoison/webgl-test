import { EntityData, EntityType, Point, customTickIntervalHasPassed, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createPaperParticle } from "../particles";

class ResearchBench extends Entity {
   public isOccupied: boolean;
   
   public static readonly WIDTH = 32 * 4;
   public static readonly HEIGHT = 20 * 4;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, isOccupied: boolean) {
      super(position, id, EntityType.researchBench, ageTicks, renderDepth);

      this.isOccupied = isOccupied;

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/research-bench/research-bench.png"),
            0,
            0
         )
      );
   }

   public tick(): void {
      super.tick();

      if (this.isOccupied && customTickIntervalHasPassed(this.ageTicks, 0.3)) {
         const offsetX = randFloat(-ResearchBench.WIDTH * 0.5, ResearchBench.WIDTH * 0.5) * 0.8;
         const offsetY = randFloat(-ResearchBench.HEIGHT * 0.5, ResearchBench.HEIGHT * 0.5) * 0.8;

         const x = this.position.x + rotateXAroundOrigin(offsetX, offsetY, this.rotation);
         const y = this.position.y + rotateYAroundOrigin(offsetX, offsetY, this.rotation);
         createPaperParticle(x, y);
      }
   }

   public updateFromData(data: EntityData<EntityType.researchBench>): void {
      super.updateFromData(data);

      this.isOccupied = data.clientArgs[0];
   }
}

export default ResearchBench;