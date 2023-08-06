import { Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class TribeHut extends Entity {
   private static readonly SIZE = 80;

   public type = "tribe_hut" as const;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: TribeHut.SIZE,
            height: TribeHut.SIZE,
            textureSource: "entities/tribe-hut/tribe-hut.png",
            zIndex: 0
         }, this)
      ]);
   }
}

export default TribeHut;