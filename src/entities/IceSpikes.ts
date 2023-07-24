import { Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class IceSpikes extends Entity {
   public type = "ice_spikes" as const;

   private static readonly WIDTH = 80;
   private static readonly HEIGHT = 80;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: IceSpikes.WIDTH,
            height: IceSpikes.HEIGHT,
            textureSource: `entities/ice-spikes/ice-spikes-2.png`,
            zIndex: 0
         }, this)
      ]);
   }
}

export default IceSpikes;