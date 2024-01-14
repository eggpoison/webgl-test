import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import GameObject from "../GameObject";
import { playSound } from "../sound";

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

   public onDie(): void {
      playSound("spear-hit.mp3", 0.4, this.position.x, this.position.y);
   }
}

export default SpearProjectile;