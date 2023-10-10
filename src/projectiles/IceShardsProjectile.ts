import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { getGameObjectTextureIndex } from "../texture-atlases/game-object-texture-atlas";

class IceShardsProjectile extends Projectile {
   private static readonly SIZE = 44;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            this,
            IceShardsProjectile.SIZE,
            IceShardsProjectile.SIZE,
            getGameObjectTextureIndex("projectiles/ice-shard.png"),
            0,
            0
         )
      );
   }
}

export default IceShardsProjectile;