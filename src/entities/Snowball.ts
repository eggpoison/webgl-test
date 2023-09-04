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

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, size: SnowballSize) {
      super(position, hitboxes, id);

      const textureSize = SNOWBALL_SIZES[size];

      this.attachRenderPart(
         new RenderPart(
            textureSize,
            textureSize,
            getTextureSource(size),
            0,
            0
         )
      );
   }
}

export default Snowball;