import { EntityType, HitboxType, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Slime extends Entity {
   private static readonly WIDTH = 88;
   private static readonly HEIGHT = 88;

   public type: EntityType = "slime";

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: Slime.WIDTH,
            height: Slime.HEIGHT,
            textureSource: `entities/slime/slime-medium-body2.png`,
            zIndex: 1
         }, this),
         new RenderPart({
            width: Slime.WIDTH,
            height: Slime.HEIGHT,
            textureSource: `entities/slime/slime-medium-eye.png`,
            zIndex: 0
         }, this),
         new RenderPart({
            width: 16,
            height: 16,
            textureSource: `entities/slime/slime-orb-small.png`,
            zIndex: 0,
            offset: () => new Point(0, -30)
         }, this)
      ]);
   }
}

export default Slime;