import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";

class WoodenFloorSpikes extends Entity {
   private static readonly WIDTH = 56;
   private static readonly HEIGHT = 56;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.woodenFloorSpikes, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            WoodenFloorSpikes.WIDTH,
            WoodenFloorSpikes.HEIGHT,
            getEntityTextureArrayIndex("entities/wooden-floor-spikes/wooden-floor-spikes.png"),
            0,
            0
         )
      );
   }
}

export default WoodenFloorSpikes;