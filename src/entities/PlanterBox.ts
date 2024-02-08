import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class PlanterBox extends Entity {
   private static readonly SIZE = 80;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number) {
      super(position, id, EntityType.planterBox, ageTicks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            PlanterBox.SIZE,
            PlanterBox.SIZE,
            getEntityTextureArrayIndex("entities/planter-box/planter-box.png"),
            0,
            0
         )
      );
   }
}

export default PlanterBox;