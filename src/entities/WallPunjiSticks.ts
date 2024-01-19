import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";

class WallPunjiSticks extends Entity {
   private static readonly WIDTH = 68;
   private static readonly HEIGHT = 32;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.wallPunjiSticks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            WallPunjiSticks.WIDTH,
            WallPunjiSticks.HEIGHT,
            getEntityTextureArrayIndex("entities/wall-punji-sticks/wall-punji-sticks.png"),
            0,
            0
         )
      );
   }
}

export default WallPunjiSticks;