import { Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class TribeTotem extends Entity {
   private static readonly RADIUS = 50;

   public type = "tribe_totem" as const;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: TribeTotem.RADIUS * 2,
            height: TribeTotem.RADIUS * 2,
            textureSource: `entities/tribe-totem/tribe-totem.png`,
            zIndex: 0
         }, this)
      ]);
   }
}

export default TribeTotem;