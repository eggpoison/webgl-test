import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";
import { playSound } from "../sound";

class WoodenFloorSpikes extends Entity {
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number) {
      super(position, id, EntityType.woodenFloorSpikes, ageTicks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            getEntityTextureArrayIndex("entities/wooden-floor-spikes/wooden-floor-spikes.png"),
            0,
            0
         )
      );

      if (ageTicks === 0) {
         playSound("spike-place.mp3", 0.5, 1, this.position.x, this.position.y);
      }
   }

   protected onHit(): void {
      playSound("wooden-spikes-hit.mp3", 0.2, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default WoodenFloorSpikes;