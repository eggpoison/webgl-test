import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class Workbench extends Entity {
   public static readonly SIZE = 80;
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number) {
      super(position, id, EntityType.workbench, ageTicks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            Workbench.SIZE,
            Workbench.SIZE,
            getEntityTextureArrayIndex("entities/workbench/workbench.png"),
            0,
            0
         )
      );
   }
}

export default Workbench;