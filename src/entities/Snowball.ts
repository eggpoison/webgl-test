import { EntityType, Point, SNOWBALL_SIZES, SnowballSize, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Board from "../Board";
import { createSnowParticle } from "../generic-particles";

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

   public tick(): void {
      super.tick();

      if (this.velocity !== null && this.velocity.magnitude > 50) {
         if (Board.tickIntervalHasPassed(0.05)) {
            createSnowParticle(this.position.x, this.position.y, randFloat(40, 60));
         }
      }
   }
}

export default Snowball;