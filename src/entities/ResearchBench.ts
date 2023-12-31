import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class ResearchBench extends Entity {
   public readonly type = EntityType.researchBench;
   
   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.researchBench, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            32 * 4,
            20 * 4,
            getGameObjectTextureArrayIndex("entities/research-bench/research-bench.png"),
            0,
            0
         )
      );
   }
}

export default ResearchBench;