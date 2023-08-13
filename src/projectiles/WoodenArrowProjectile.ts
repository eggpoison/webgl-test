import { Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";

class WoodenArrowProjectile extends Projectile {
   private static readonly HEIGHT = 20;
   private static readonly WIDTH = 64;
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart({
            width: WoodenArrowProjectile.WIDTH,
            height: WoodenArrowProjectile.HEIGHT,
            textureSource: "projectiles/wooden-arrow.png",
            zIndex: 0
         }, this)
      );
   }
}

export default WoodenArrowProjectile;