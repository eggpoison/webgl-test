import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Workbench extends Entity {
   public static readonly SIZE = 80;
   
   public readonly type = "workbench";
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            Workbench.SIZE,
            Workbench.SIZE,
            "entities/workbench/workbench.png",
            0,
            0
         )
      );
   }
}

export default Workbench;