import { Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";

class SmallSnowProjectile extends Projectile {
   private static readonly RADIUS = 22;
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart({
            width: SmallSnowProjectile.RADIUS * 2,
            height: SmallSnowProjectile.RADIUS * 2,
            textureSource: "projectiles/snowball-small.png",
            zIndex: 0
         }, this)
      );
   }
}

export default SmallSnowProjectile;