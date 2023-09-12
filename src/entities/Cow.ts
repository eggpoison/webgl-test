import { CowSpecies, HitData, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { BloodParticleSize, createBloodParticle, createBloodPoolParticle, createFootprintParticle } from "../generic-particles";
import Board from "../Board";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   private static readonly HEAD_IMAGE_WIDTH = 18 * 4;
   private static readonly HEAD_IMAGE_HEIGHT = 16 * 4;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_WIDTH = 64;
   private static readonly BODY_HEIGHT = 96;

   public readonly type = "cow";

   private numFootstepsTaken = 0;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, species: CowSpecies) {
      super(position, hitboxes, id);

      const cowNum = species === CowSpecies.brown ? 1 : 2;

      // Body
      const bodyRenderPart = new RenderPart(
         Cow.BODY_WIDTH,
         Cow.BODY_HEIGHT,
         `entities/cow/cow-body-${cowNum}.png`,
         0,
         0
      );
      bodyRenderPart.offset = new Point(0, -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2);
      this.attachRenderPart(bodyRenderPart);

      // Head
      const headRenderPart = new RenderPart(
         Cow.HEAD_IMAGE_WIDTH,
         Cow.HEAD_IMAGE_HEIGHT,
         `entities/cow/cow-head-${cowNum}.png`,
         1,
         0
      );
      headRenderPart.offset = new Point(0, (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2);
      this.attachRenderPart(headRenderPart);
   }
   
   public tick(): void {
      super.tick();

      // Create footsteps
      if (this.velocity !== null && Board.tickIntervalHasPassed(0.3)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 5);

         this.numFootstepsTaken++;
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particles
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(this.position);
      }
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const spawnPosition = Point.fromVectorForm(32, hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5));
            spawnPosition.x += this.position.x;
            spawnPosition.y += this.position.y;
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPosition, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }
}

export default Cow;