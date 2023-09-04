import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Boulder extends Entity {
   private static readonly WIDTH = 80;
   private static readonly HEIGHT = 80;

   public type: EntityType = "boulder";

   private static readonly TEXTURE_SOURCES = [
      "entities/boulder/boulder1.png",
      "entities/boulder/boulder2.png"
   ];

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, boulderType: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            Boulder.WIDTH,
            Boulder.HEIGHT,
            Boulder.TEXTURE_SOURCES[boulderType],
            0,
            0
         )
      );
   }
}

export default Boulder;