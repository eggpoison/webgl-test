import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import GameObject from "../GameObject";

class IceShardsProjectile extends GameObject {
   private static readonly SIZE = 44;
   
   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.iceShardProjectile, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            IceShardsProjectile.SIZE,
            IceShardsProjectile.SIZE,
            getEntityTextureArrayIndex("projectiles/ice-shard.png"),
            0,
            0
         )
      );
   }
}

export default IceShardsProjectile;