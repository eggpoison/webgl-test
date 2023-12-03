import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class IceShardsProjectile extends Projectile {
   private static readonly SIZE = 44;
   
   constructor(position: Point, id: number, renderDepth: number, data: any) {
      super(position, id, renderDepth, data);

      this.attachRenderPart(
         new RenderPart(
            this,
            IceShardsProjectile.SIZE,
            IceShardsProjectile.SIZE,
            getGameObjectTextureArrayIndex("projectiles/ice-shard.png"),
            0,
            0
         )
      );
   }
}

export default IceShardsProjectile;