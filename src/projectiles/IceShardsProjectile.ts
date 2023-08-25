import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class IceShardsProjectile extends Projectile {
   private static readonly SIZE = 44;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart({
            width: IceShardsProjectile.SIZE,
            height: IceShardsProjectile.SIZE,
            textureSource: "projectiles/ice-shard.png",
            zIndex: 0
         }, this)
      );
   }
}

export default IceShardsProjectile;