import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class TribeHut extends Entity {
   private static readonly SIZE = 88;

   private static readonly DOOR_WIDTH = 12;
   private static readonly DOOR_HEIGHT = 36;

   public type = "tribe_hut" as const;

   public tribeID: number | null;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null, tribeID: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.tribeID = tribeID;
      
      // Hut
      const hutRenderPart = new RenderPart({
         width: TribeHut.SIZE,
         height: TribeHut.SIZE,
         textureSource: "entities/tribe-hut/tribe-hut.png",
         zIndex: 2
      });

      const doorOffset = new Point(-TribeHut.SIZE/4, TribeHut.SIZE/2 + TribeHut.DOOR_HEIGHT/2);

      // Door
      hutRenderPart.attachRenderPart(
         new RenderPart({
            width: TribeHut.DOOR_WIDTH,
            height: TribeHut.DOOR_HEIGHT,
            textureSource: "entities/tribe-hut/tribe-hut-door.png",
            zIndex: 1,
            offset: () => doorOffset
         })
      );

      this.attachRenderPart(hutRenderPart);
   }
}

export default TribeHut;