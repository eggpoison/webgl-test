import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Slimewisp extends Entity {
   private static readonly RADIUS = 16;

   public type: EntityType = "slimewisp";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: Slimewisp.RADIUS * 2,
            height: Slimewisp.RADIUS * 2,
            textureSource: `entities/slimewisp/slimewisp.png`,
            zIndex: 0,
            opacity: 0.8
         }, this)
      ]);
   }
}

export default Slimewisp;