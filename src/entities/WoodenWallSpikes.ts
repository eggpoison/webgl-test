import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";

class WoodenWallSpikes extends Entity {
   private static readonly WIDTH = 68;
   private static readonly HEIGHT = 32;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.woodenWallSpikes, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            WoodenWallSpikes.WIDTH,
            WoodenWallSpikes.HEIGHT,
            getEntityTextureArrayIndex("entities/wooden-wall-spikes/wooden-wall-spikes.png"),
            0,
            0
         )
      );
   }
}

export default WoodenWallSpikes;