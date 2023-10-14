import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class TribeHut extends Entity {
   public static readonly SIZE = 88;

   private static readonly DOOR_WIDTH = 12;
   private static readonly DOOR_HEIGHT = 36;

   public type = "tribe_hut" as const;

   public tribeID: number | null;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, tribeID: number | null) {
      super(position, hitboxes, id, renderDepth);

      this.tribeID = tribeID;
      
      // Hut
      const hutRenderPart = new RenderPart(
         this,
         TribeHut.SIZE,
         TribeHut.SIZE,
         getGameObjectTextureArrayIndex("entities/tribe-hut/tribe-hut.png"),
         2,
         0
      );
      this.attachRenderPart(hutRenderPart);

      // Door
      const doorRenderPart = new RenderPart(
         this,
         TribeHut.DOOR_WIDTH,
         TribeHut.DOOR_HEIGHT,
         getGameObjectTextureArrayIndex("entities/tribe-hut/tribe-hut-door.png"),
         1,
         0
      );
      doorRenderPart.offset = new Point(-TribeHut.SIZE/4, TribeHut.SIZE/2 + TribeHut.DOOR_HEIGHT/2);
      this.attachRenderPart(doorRenderPart);
   }
}

export default TribeHut;