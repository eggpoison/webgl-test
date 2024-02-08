import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import GameObject from "../GameObject";
import { playSound } from "../sound";

class SpearProjectile extends GameObject {
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number) {
      super(position, id, EntityType.spearProjectile, ageTicks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            5 * 4,
            24 * 4,
            getEntityTextureArrayIndex("items/misc/spear.png"),
            0,
            0
         )
      );

      playSound("spear-throw.mp3", 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("spear-hit.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default SpearProjectile;