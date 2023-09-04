import { HitData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createBloodParticle } from "../generic-particles";

const ZOMBIE_TEXTURE_SOURCES: { [zombieType: number]: string } = {
   0: "entities/zombie/zombie1.png",
   1: "entities/zombie/zombie2.png",
   2: "entities/zombie/zombie3.png",
   3: "entities/zombie/zombie-golden.png"
};

class Zombie extends Entity {
   public readonly type = "zombie";

   private static readonly RADIUS = 32;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, zombieType: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            Zombie.RADIUS * 2,
            Zombie.RADIUS * 2,
            ZOMBIE_TEXTURE_SOURCES[zombieType],
            0,
            0
         )
      );
   }

   protected onHit(hitData: HitData): void {
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            createBloodParticle(this.position, hitData.angleFromAttacker, Zombie.RADIUS);
         }
      }
   }
}

export default Zombie;