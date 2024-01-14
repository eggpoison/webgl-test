import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class PlanterBox extends Entity {
   private static readonly SIZE = 80;

   public type = EntityType.planterBox;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.planterBox, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            PlanterBox.SIZE,
            PlanterBox.SIZE,
            getGameObjectTextureArrayIndex("entities/planter-box/planter-box.png"),
            0,
            0
         )
      );
   }
}

export default PlanterBox;