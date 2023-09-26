import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Slimewisp extends Entity {
   private static readonly RADIUS = 16;

   public type: EntityType = "slimewisp";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super(position, hitboxes, id);

      const renderPart = new RenderPart(
         Slimewisp.RADIUS * 2,
         Slimewisp.RADIUS * 2,
         `entities/slimewisp/slimewisp.png`,
         0,
         0
      );
      renderPart.opacity = 0.8;
      this.attachRenderPart(renderPart);
   }

   protected overrideTileMoveSpeedMultiplier(): number | null {
      // Slimewisps move at normal speed on slime blocks
      if (this.tile.type === "slime") {
         return 1;
      }
      return null;
   }
}

export default Slimewisp;