import { HitboxType, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Barrel extends Entity {
   private static readonly RADIUS = 40;

   public type = "barrel" as const;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: Barrel.RADIUS * 2,
            height: Barrel.RADIUS * 2,
            textureSource: "entities/barrel/barrel.png",
            zIndex: 0
         }, this)
      ]);
   }
}

export default Barrel;