import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class ResearchBench extends Entity {
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number) {
      super(position, id, EntityType.researchBench, ageTicks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            32 * 4,
            20 * 4,
            getEntityTextureArrayIndex("entities/research-bench/research-bench.png"),
            0,
            0
         )
      );
   }
}

export default ResearchBench;