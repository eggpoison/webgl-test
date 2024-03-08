import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import GameObject from "../GameObject";

class Workbench extends GameObject {
   public static readonly SIZE = 80;
   
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.workbench, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/workbench/workbench.png"),
            0,
            0
         )
      );
   }
}

export default Workbench;