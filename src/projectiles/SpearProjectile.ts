import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import GameObject from "../GameObject";
import { playSound } from "../sound";

class SpearProjectile extends GameObject {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.spearProjectile, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("items/misc/spear.png"),
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