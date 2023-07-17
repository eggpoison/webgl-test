import { EntityType, HitboxType, Point } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import Hitbox from "../hitboxes/Hitbox";

class BerryBush extends Entity {
   private static readonly WIDTH = 80;
   private static readonly HEIGHT = 80;

   public type: EntityType = "berry_bush";

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            entity: this,
            width: BerryBush.WIDTH,
            height: BerryBush.HEIGHT,
            textureSource: `berry-bush.png`,
            zIndex: 0
         })
      ]);
   }
}

export default BerryBush;