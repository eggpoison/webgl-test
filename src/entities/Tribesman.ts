import { HitboxType, Point, TribeType } from "webgl-test-shared";
import TribeMember from "./TribeMember";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";

class Tribesman extends TribeMember {
   public readonly type = "tribesman";

   private static readonly RADIUS = 32;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeType: TribeType) {
      super(position, hitboxes, id, secondsSinceLastHit, tribeType);

      this.attachRenderParts([
         new RenderPart({
            width: Tribesman.RADIUS * 2,
            height: Tribesman.RADIUS * 2,
            textureSource: "entities/human/human1.png",
            zIndex: 0
         }, this)
      ]);
   }
}

export default Tribesman;