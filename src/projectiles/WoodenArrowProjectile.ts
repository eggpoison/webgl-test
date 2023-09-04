import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class WoodenArrowProjectile extends Projectile {
   private static readonly HEIGHT = 64;
   private static readonly WIDTH = 20;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            WoodenArrowProjectile.WIDTH,
            WoodenArrowProjectile.HEIGHT,
            "projectiles/wooden-arrow.png",
            0,
            0
         )
      );
   }
}

export default WoodenArrowProjectile;