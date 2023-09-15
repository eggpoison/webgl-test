import { HitData, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { BloodParticleSize, createBloodParticle, createBloodPoolParticle, createFootprintParticle } from "../generic-particles";
import Board from "../Board";

const ZOMBIE_TEXTURE_SOURCES: { [zombieType: number]: string } = {
   0: "entities/zombie/zombie1.png",
   1: "entities/zombie/zombie2.png",
   2: "entities/zombie/zombie3.png",
   3: "entities/zombie/zombie-golden.png"
};

class Zombie extends Entity {
   private static readonly DEATH_PARTICLE_SPAWN_INTERVAL = 0.1;
   private static readonly DEATH_PARTICLE_RAY_COUNT = 5;

   private static readonly RADIUS = 32;
   
   public readonly type = "zombie";

   private numFootstepsTaken = 0;
   
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

   public tick(): void {
      super.tick();

      // Create footsteps
      if (this.velocity !== null && !this.isInRiver(this.findCurrentTile()) && Board.tickIntervalHasPassed(0.3)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 4);

         this.numFootstepsTaken++;
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
   }

   public onDie(): void {
      const origin = this.position.copy();
      const offset = 2 * Math.PI * Math.random();

      for (let i = 0; i < 4; i++) {
         Board.addTickCallback(Zombie.DEATH_PARTICLE_SPAWN_INTERVAL * (i + 1), () => {
            for (let j = 0; j < Zombie.DEATH_PARTICLE_RAY_COUNT; j++) {
               let moveDirection = 2 * Math.PI / Zombie.DEATH_PARTICLE_RAY_COUNT * j + offset;
               moveDirection += randFloat(-0.3, 0.3);

               createBloodParticle(BloodParticleSize.large, this.position.x, this.position.y, moveDirection, randFloat(100, 200), false);
            }
         });
      }
   }
}

export default Zombie;