import { EntityType, Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Yeti extends Entity {
   private static readonly SIZE = 128;

   public type: EntityType = "yeti";

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderPart(
         new RenderPart({
            width: Yeti.SIZE,
            height: Yeti.SIZE,
            textureSource: "entities/yeti.png",
            zIndex: 1
         }, this)
      );
   }
}

export default Yeti;