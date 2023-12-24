import { EntityType, HitData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import { playBuildingHitSound, playSound } from "../sound";

class TribeHut extends Entity {
   public static readonly SIZE = 88;

   private static readonly DOOR_WIDTH = 12;
   private static readonly DOOR_HEIGHT = 36;

   public type = EntityType.tribeHut;

   public tribeID: number | null;

   constructor(position: Point, id: number, renderDepth: number, tribeID: number | null) {
      super(position, id, EntityType.tribeHut, renderDepth);

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

   protected onHit(hitData: HitData): void {
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, this.position.x, this.position.y);
   }
}

export default TribeHut;