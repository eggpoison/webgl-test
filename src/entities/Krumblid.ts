import { HitData, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createFootprintParticle } from "../generic-particles";
import Board from "../Board";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class Krumblid extends Entity {
   private static readonly SPRITE_WIDTH = 16 * 4;
   private static readonly SPRITE_HEIGHT = 14 * 4;

   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   public readonly type = "krumblid";

   private numFootstepsTaken = 0;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number) {
      super(position, hitboxes, id, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            Krumblid.SPRITE_WIDTH,
            Krumblid.SPRITE_HEIGHT,
            getGameObjectTextureArrayIndex("entities/krumblid/krumblid.png"),
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