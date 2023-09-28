import { Point } from "webgl-test-shared";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";

class FrozenYeti extends Entity {
   private static readonly SIZE = 144;
   private static readonly HEAD_SIZE = 72;

   public readonly type = "frozen_yeti";
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(new RenderPart(
         FrozenYeti.SIZE,
         FrozenYeti.SIZE,
         "entities/frozen-yeti/frozen-yeti.png",
         0,
         0
      ));

      const headRenderPart = new RenderPart(
         FrozenYeti.HEAD_SIZE,
         FrozenYeti.HEAD_SIZE,
         "entities/frozen-yeti/frozen-yeti-head.png",
         1,
         0
      );
      headRenderPart.offset = new Point(0, FrozenYeti.SIZE / 2 - 24);
      this.attachRenderPart(headRenderPart);
   }
}

export default FrozenYeti;