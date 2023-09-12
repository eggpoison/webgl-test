import { EntityType, Point, EntityData, lerp, HitData, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { BloodParticleSize, createBloodParticle, createBloodPoolParticle, createFootprintParticle } from "../generic-particles";
import Board from "../Board";

class Yeti extends Entity {
   private static readonly SIZE = 128;

   private static readonly PAW_SIZE = 28;

   private static readonly PAW_START_ANGLE = Math.PI/3;
   private static readonly PAW_END_ANGLE = Math.PI/6;

   public type: EntityType = "yeti";

   private numFootstepsTaken = 0;

   private attackProgress = 1;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, attackProgress: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            Yeti.SIZE,
            Yeti.SIZE,
            "entities/yeti.png",
            1,
            0
         )
      );

      for (let i = 0; i < 2; i++) {
         this.createPaw(i);
      }

      this.attackProgress = attackProgress;
   }
   
   private createPaw(i: number): void {
      const paw = new RenderPart(
         Yeti.PAW_SIZE,
         Yeti.PAW_SIZE,
         "entities/yeti-paw.png",
         0,
         0
      );
      paw.offset = () => {
         let attackProgress = this.attackProgress;
         attackProgress = Math.pow(attackProgress, 0.75);

         const angle = lerp(Yeti.PAW_END_ANGLE, Yeti.PAW_START_ANGLE, attackProgress) * (i === 0 ? 1 : -1);
         return Point.fromVectorForm(Yeti.SIZE/2, angle);
      }
      this.attachRenderPart(paw);
   }

   public tick(): void {
      super.tick();

      // Create footsteps
      if (this.velocity !== null && Board.tickIntervalHasPassed(0.55)) {
         createFootprintParticle(this, this.numFootstepsTaken, 40, 96, 8);

         this.numFootstepsTaken++;
      }
   }

   public updateFromData(entityData: EntityData<"yeti">): void {
      super.updateFromData(entityData);

      this.attackProgress = entityData.clientArgs[0];
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBloodPoolParticle(this.position);
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const spawnPosition = Point.fromVectorForm(Yeti.SIZE / 2, hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5));
            spawnPosition.x += this.position.x;
            spawnPosition.y += this.position.y;

            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPosition, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }
}

export default Yeti;