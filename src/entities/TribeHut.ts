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

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, tribeID: number | null) {
      super(position, hitboxes, id);

      this.tribeID = tribeID;
      
      // Hut
      const hutRenderPart = new RenderPart(
         TribeHut.SIZE,
         TribeHut.SIZE,
         "entities/tribe-hut/tribe-hut.png",
         2,
         0
      );
      this.attachRenderPart(hutRenderPart);

      // Door
      const doorRenderPart = new RenderPart(
         TribeHut.DOOR_WIDTH,
         TribeHut.DOOR_HEIGHT,
         "entities/tribe-hut/tribe-hut-door.png",
         1,
         0
      );
      doorRenderPart.offset = new Point(-TribeHut.SIZE/4, TribeHut.SIZE/2 + TribeHut.DOOR_HEIGHT/2);
      hutRenderPart.attachRenderPart(doorRenderPart);

   }
}

export default TribeHut;