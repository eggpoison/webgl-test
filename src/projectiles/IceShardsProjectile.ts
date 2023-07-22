import { Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";

class IceShardsProjectile extends Projectile {
   private static readonly SIZE = 44;
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number) {
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