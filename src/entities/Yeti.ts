import { EntityType, Point, EntityData, lerp, HitData, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createFootprintParticle, createSnowParticle, createWhiteSmokeParticle } from "../generic-particles";
import Board from "../Board";
import { getGameObjectTextureIndex } from "../texture-atlases/game-object-texture-atlas";

class Yeti extends Entity {
   private static readonly SIZE = 128;

   private static readonly PAW_SIZE = 28;

   private static readonly PAW_START_ANGLE = Math.PI/3;
   private static readonly PAW_END_ANGLE = Math.PI/6;

   private static readonly SNOW_THROW_OFFSET = 64;

   private static readonly BLOOD_POOL_SIZE = 30;
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.15;

   public type: EntityType = "yeti";

   private numFootstepsTaken = 0;

   private lastAttackProgress = 1;
   private attackProgress = 1;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, attackProgress: number) {
      super(position, hitboxes, id, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            Yeti.SIZE,
            Yeti.SIZE,
            getGameObjectTextureIndex("entities/yeti/yeti.png"),
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
         this,
         Yeti.PAW_SIZE,
         Yeti.PAW_SIZE,
         getGameObjectTextureIndex("entities/yeti/yeti-paw.png"),
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
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver() && Board.tickIntervalHasPassed(0.55)) {
         createFootprintParticle(this, this.numFootstepsTaken, 40, 96, 8);

         this.numFootstepsTaken++;
      }

      // Create snow impact particles when the Yeti does a throw attack
      if (this.attackProgress === 0 && this.lastAttackProgress !== 0) {
         const offsetMagnitude = Yeti.SNOW_THROW_OFFSET + 20;
         const impactPositionX = this.position.x + offsetMagnitude * Math.sin(this.rotation);
         const impactPositionY = this.position.y + offsetMagnitude * Math.cos(this.rotation);
         
         for (let i = 0; i < 30; i++) {
            const offsetMagnitude = randFloat(0, 20);
            const offsetDirection = 2 * Math.PI * Math.random();
            const positionX = impactPositionX + offsetMagnitude * Math.sin(offsetDirection);
            const positionY = impactPositionY + offsetMagnitude * Math.cos(offsetDirection);
            
            createSnowParticle(positionX, positionY, randFloat(40, 100));
         }

         // White smoke particles
         for (let i = 0; i < 10; i++) {
            const spawnPositionX = impactPositionX;
            const spawnPositionY = impactPositionY;
            createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 1);
         }
      }
      this.lastAttackProgress = this.attackProgress;
   }

   public updateFromData(entityData: EntityData<"yeti">): void {
      super.updateFromData(entityData);

      this.attackProgress = entityData.clientArgs[0];
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBloodPoolParticle(this.position.x, this.position.y, Yeti.BLOOD_POOL_SIZE);
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + Yeti.SIZE / 2 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + Yeti.SIZE / 2 * Math.cos(offsetDirection);
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }

   public onDie(): void {
      createBloodPoolParticle(this.position.x, this.position.y, Yeti.BLOOD_POOL_SIZE);

      createBloodParticleFountain(this, Yeti.BLOOD_FOUNTAIN_INTERVAL, 1.6);
   }
}

export default Yeti;