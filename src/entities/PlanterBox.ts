import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import GameObject from "../GameObject";

class PlanterBox extends GameObject {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.planterBox, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/planter-box/planter-box.png"),
            0,
            0
         )
      );
   }
}

export default PlanterBox;