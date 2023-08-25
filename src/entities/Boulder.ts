import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Boulder extends Entity {
   private static readonly WIDTH = 80;
   private static readonly HEIGHT = 80;

   public type: EntityType = "boulder";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null, boulderType: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: Boulder.WIDTH,
            height: Boulder.HEIGHT,
            textureSource: `entities/boulder/boulder${boulderType + 1}.png`,
            zIndex: 0
         }, this)
      ]);
   }
}

export default Boulder;