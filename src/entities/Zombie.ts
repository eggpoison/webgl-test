import { HitData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createBloodParticle } from "../generic-particles";

const ZOMBIE_TEXTURE_SOURCES: { [zombieType: number]: string } = {
   0: "zombie1.png",
   1: "zombie2.png",
   2: "zombie3.png",
   3: "zombie-golden.png"
}

class Zombie extends Entity {
   public readonly type = "zombie";

   private static readonly RADIUS = 32;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, zombieType: number) {
      super(position, hitboxes, id);

      this.attachRenderParts([
         new RenderPart({
            width: Zombie.RADIUS * 2,
            height: Zombie.RADIUS * 2,
            textureSource: "entities/zombie/" + ZOMBIE_TEXTURE_SOURCES[zombieType],
            zIndex: 0
         })
      ]);
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