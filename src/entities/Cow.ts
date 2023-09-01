import { CowSpecies, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   private static readonly HEAD_IMAGE_WIDTH = 18 * 4;
   private static readonly HEAD_IMAGE_HEIGHT = 16 * 4;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_WIDTH = 64;
   private static readonly BODY_HEIGHT = 96;

   public readonly type = "cow";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null, species: CowSpecies) {
      super(position, hitboxes, id, secondsSinceLastHit);

      const cowNum = species === CowSpecies.brown ? 1 : 2;
      this.attachRenderParts([
         // Body
         new RenderPart({
            width: Cow.BODY_WIDTH,
            height: Cow.BODY_HEIGHT,
            textureSource: `entities/cow/cow-body-${cowNum}.png`,
            offset: () => new Point(0, -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2),
            zIndex: 0
         }),
         // Head
         new RenderPart({
            width: Cow.HEAD_IMAGE_WIDTH,
            height: Cow.HEAD_IMAGE_HEIGHT,
            textureSource: `entities/cow/cow-head-${cowNum}.png`,
            offset: () => new Point(0, (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2),
            zIndex: 1
         })
      ]);
   }
}

export default Cow;