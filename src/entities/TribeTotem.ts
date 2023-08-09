import { Point, HitboxType, Vector } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class TribeTotem extends Entity {
   private static readonly RADIUS = 60;

   private static readonly BANNER_WIDTH = 32;
   private static readonly BANNER_HEIGHT = 16;
   
   public type = "tribe_totem" as const;

   public tribeID: number;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeID: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: TribeTotem.RADIUS * 2,
            height: TribeTotem.RADIUS * 2,
            textureSource: `entities/tribe-totem/tribe-totem.png`,
            zIndex: 0
         }, this)
      ]);

      this.attachRenderParts([
         new RenderPart({
            width: TribeTotem.BANNER_WIDTH,
            height: TribeTotem.BANNER_HEIGHT,
            textureSource: "entities/tribe-totem/goblin-banner.png",
            offset: () => new Vector(40, Math.PI / 7).convertToPoint(),
            zIndex: 1
         }, this)
      ]);

      this.tribeID = tribeID;
   }
}

export default TribeTotem;