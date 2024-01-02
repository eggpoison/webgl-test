import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";

class WoodenWall extends Entity {
   private static readonly SIZE = 64;

   public type = EntityType.boulder;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.boulder, renderDepth);

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
   }
}

export default WoodenWall;