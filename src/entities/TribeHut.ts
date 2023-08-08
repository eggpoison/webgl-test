import { Point, HitboxType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class TribeHut extends Entity {
   private static readonly SIZE = 88;

   private static readonly DOOR_WIDTH = 12;
   private static readonly DOOR_HEIGHT = 36;

   public type = "tribe_hut" as const;

   public tribeID: number | null;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeID: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.tribeID = tribeID;
      
      // Hut
      const hutRenderPart = new RenderPart({
         width: TribeHut.SIZE,
         height: TribeHut.SIZE,
         textureSource: "entities/tribe-hut/tribe-hut.png",
         zIndex: 1
      }, this);

      const doorOffset = new Point(-TribeHut.SIZE/4, TribeHut.SIZE/2 + TribeHut.DOOR_HEIGHT/2);

      // Door
      hutRenderPart.attachRenderPart(
         new RenderPart({
            width: TribeHut.DOOR_WIDTH,
            height: TribeHut.DOOR_HEIGHT,
            textureSource: "entities/tribe-hut/tribe-hut-door.png",
            zIndex: 0,
            // getRotation: () => -Math.PI / 2,
            offset: () => doorOffset
         }, this)
      );

      this.attachRenderPart(hutRenderPart);
   }
}

export default TribeHut;