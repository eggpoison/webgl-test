import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import GameObject from "../GameObject";
import Board from "../Board";
import { attachSoundToEntity, playSound } from "../sound";

class BattleaxeProjectile extends GameObject {
   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.battleaxeProjectile, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            64,
            64,
            getEntityTextureArrayIndex("items/large/stone-battleaxe.png"),
            0,
            0
         )
      );

      this.playWhoosh();
   }

   public tick(): void {
      super.tick();

      if (Board.tickIntervalHasPassed(0.25)) {
         this.playWhoosh();
      }
   }

   private playWhoosh(): void {
      const soundInfo = playSound("air-whoosh.mp3", 0.25, this.position.x, this.position.y);
      attachSoundToEntity(soundInfo.sound, this);
   }
}

export default BattleaxeProjectile;