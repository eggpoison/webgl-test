import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";

class FloorPunjiSticks extends Entity {
   private static readonly WIDTH = 40;
   private static readonly HEIGHT = 40;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.floorPunjiSticks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            FloorPunjiSticks.WIDTH,
            FloorPunjiSticks.HEIGHT,
            getEntityTextureArrayIndex("entities/floor-punji-sticks/floor-punji-sticks.png"),
            0,
            0
         )
      );
   }
}

export default FloorPunjiSticks;