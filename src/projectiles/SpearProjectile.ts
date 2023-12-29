import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import GameObject from "../GameObject";

class SpearProjectile extends GameObject {
   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.spearProjectile, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            5 * 4,
            24 * 4,
            getGameObjectTextureArrayIndex("items/misc/spear.png"),
            0,
            0
         )
      );
   }
}

export default SpearProjectile;