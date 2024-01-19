import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";

class WoodenEmbrasure extends Entity {
   private static readonly WIDTH = 64;
   private static readonly HEIGHT = 20;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.woodenEmbrasure, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            WoodenEmbrasure.WIDTH,
            WoodenEmbrasure.HEIGHT,
            getEntityTextureArrayIndex("entities/wooden-embrasure/wooden-embrasure.png"),
            0,
            0
         )
      );
   }
}

export default WoodenEmbrasure;