import { EntityType, HitData, Point, SETTINGS, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createFootprintParticle } from "../generic-particles";
import Board from "../Board";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import { AudioFilePath, playSound } from "../sound";

const ZOMBIE_TEXTURE_SOURCES: { [zombieType: number]: string } = {
   0: "entities/zombie/zombie1.png",
   1: "entities/zombie/zombie2.png",
   2: "entities/zombie/zombie3.png",
   3: "entities/zombie/zombie-golden.png"
};

class Zombie extends Entity {
   private static readonly RADIUS = 32;
   
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;
   
   public readonly type = EntityType.zombie;

   private numFootstepsTaken = 0;
   private distanceTracker = 0;
   
   constructor(position: Point, id: number, renderDepth: number, zombieType: number) {
      super(position, id, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            Zombie.RADIUS * 2,
            Zombie.RADIUS * 2,
            getGameObjectTextureArrayIndex(ZOMBIE_TEXTURE_SOURCES[zombieType]),
            0,
            0
         )
      );
   }

public tick(): void {
      super.tick();

      // Create footsteps
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver() && Board.tickIntervalHasPassed(0.3)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 4);
         this.numFootstepsTaken++;
      }
      this.distanceTracker += this.velocity.length() / SETTINGS.TPS;
      if (this.distanceTracker > 45) {
         this.distanceTracker -= 45;
         this.createFootstepSound();
      }

      if (Math.random() < 0.1 / SETTINGS.TPS) {
         playSound(("zombie-ambient-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, this.position.x, this.position.y);
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + Zombie.RADIUS * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + Zombie.RADIUS * Math.cos(offsetDirection);
         
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }

      playSound(("zombie-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, this.position.x, this.position.y);
   }

   public onDie(): void {
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      createBloodParticleFountain(this, Zombie.BLOOD_FOUNTAIN_INTERVAL, 1);

      playSound("zombie-die-1.mp3", 0.4, this.position.x, this.position.y);
   }
}

export default Zombie;