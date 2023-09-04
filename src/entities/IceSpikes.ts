import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class IceSpikes extends Entity {
   public type = "ice_spikes" as const;

   private static readonly WIDTH = 80;
   private static readonly HEIGHT = 80;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            IceSpikes.WIDTH,
            IceSpikes.HEIGHT,
             `entities/ice-spikes/ice-spikes.png`,
             0,
             0
         )
      );
   }
}

export default IceSpikes;