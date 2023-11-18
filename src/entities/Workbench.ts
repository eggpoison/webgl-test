import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class Workbench extends Entity {
   public static readonly SIZE = 80;
   
   public readonly type = "workbench";
   
   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            Workbench.SIZE,
            Workbench.SIZE,
            getGameObjectTextureArrayIndex("entities/workbench/workbench.png"),
            0,
            0
         )
      );
   }
}

export default Workbench;