import { EntityType, Point, SNOWBALL_SIZES, SnowballSize } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

const getTextureSource = (size: SnowballSize): string => {
   switch (size) {
      case SnowballSize.small: {
         return "entities/snowball/snowball-small.png";
      }
      case SnowballSize.large: {
         return "entities/snowball/snowball-large.png";
      }
   }
}

class Snowball extends Entity {
   public type: EntityType = "snowball";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null, size: SnowballSize) {
      super(position, hitboxes, id, secondsSinceLastHit);

      const textureSize = SNOWBALL_SIZES[size];

      this.attachRenderParts([
         new RenderPart({
            width: textureSize,
            height: textureSize,
            textureSource: getTextureSource(size),
            zIndex: 0
         })
      ]);
   }
}

export default Snowball;