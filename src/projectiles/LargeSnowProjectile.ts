import { Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";

class LargeSnowProjectile extends Projectile {
   private static readonly RADIUS = 30;
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart({
            width: LargeSnowProjectile.RADIUS * 2,
            height: LargeSnowProjectile.RADIUS * 2,
            textureSource: "projectiles/snowball-large.png",
            zIndex: 0
         }, this)
      );
   }
}

export default LargeSnowProjectile;