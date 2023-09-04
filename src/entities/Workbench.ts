import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Workbench extends Entity {
   public readonly type = "workbench";
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderParts([
         new RenderPart({
            width: 80,
            height: 80,
            textureSource: "entities/workbench/workbench.png",
            zIndex: 0
         })
      ]);
   }
}

export default Workbench;