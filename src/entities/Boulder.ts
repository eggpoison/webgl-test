import { EntityType, HitboxType, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Boulder extends Entity {
   private static readonly WIDTH = 80;
   private static readonly HEIGHT = 80;

   public type: EntityType = "boulder";

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, boulderType: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.addRenderParts([
         new RenderPart({
            width: Boulder.WIDTH,
            height: Boulder.HEIGHT,
            textureSource: `boulder/boulder${boulderType + 1}.png`
         })
      ])
   }
}

export default Boulder;