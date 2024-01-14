import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";
import { playSound } from "../sound";

class WoodenWall extends Entity {
   private static readonly SIZE = 64;

   public type = EntityType.woodenWall;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.woodenWall, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            WoodenWall.SIZE,
            WoodenWall.SIZE,
            getGameObjectTextureArrayIndex("entities/wooden-wall/wooden-wall.png"),
            0,
            0
         )
      );

      playSound("wooden-wall-place.mp3", 0.3, this.position.x, this.position.y);
   }

   protected onHit(): void {
      playSound("wooden-wall-hit.mp3", 0.3, this.position.x, this.position.y);
   }
   
   public onDie(): void {
      playSound("wooden-wall-break.mp3", 0.4, this.position.x, this.position.y);
   }
}

export default WoodenWall;