import { EntityType, HitData, Point, SettingsConst, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createFootprintParticle } from "../particles";
import Board from "../Board";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class Krumblid extends Entity {
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   private numFootstepsTaken = 0;
   private distanceTracker = 0;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number) {
      super(position, id, EntityType.krumblid, ageTicks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/krumblid/krumblid.png"),
            0,
            0
         )
      );
   }
   
   public tick(): void {
      super.tick();

      // Create footsteps
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver() && Board.tickIntervalHasPassed(0.3)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 5);
         this.numFootstepsTaken++;
      }
      this.distanceTracker += this.velocity.length() / SettingsConst.TPS;
      if (this.distanceTracker > 50) {
         this.distanceTracker -= 50;
         this.createFootstepSound();
      }
   }

   protected onHit(hitData: HitData): void {
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 5; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + 32 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + 32 * Math.cos(offsetDirection);
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }

   public onDie(): void {
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(this.position.x, this.position.y, 35);
      }

      createBloodParticleFountain(this, Krumblid.BLOOD_FOUNTAIN_INTERVAL, 0.8);
   }
}

export default Krumblid;