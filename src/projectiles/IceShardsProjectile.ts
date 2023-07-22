import { Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";

class IceShardsProjectile extends Projectile {
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart({
            width: 32,
            height: 32,
            textureSource: "items/frostcicle.png",
            zIndex: 0
         }, this)
      );
   }
}

export default IceShardsProjectile;