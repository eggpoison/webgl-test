import { CowSpecies, EntityData, EntityType, HitData, Point, SETTINGS, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createDirtParticle, createFootprintParticle } from "../particles";
import Board from "../Board";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { AudioFilePath, playSound } from "../sound";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_HEIGHT = 96;

   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   private grazeProgress: number;

   private numFootstepsTaken = 0;
   private distanceTracker = 0;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, species: CowSpecies, grazeProgress: number) {
      super(position, id, EntityType.cow, ageTicks, renderDepth);

      this.grazeProgress = grazeProgress;

      const cowNum = species === CowSpecies.brown ? 1 : 2;

      // Body
      const bodyRenderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/cow/cow-body-${cowNum}.png`),
         0,
         0
      );
      bodyRenderPart.offset = new Point(0, -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2);
      this.attachRenderPart(bodyRenderPart);

      // Head
      const headRenderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/cow/cow-head-${cowNum}.png`),
         1,
         0
      );
      headRenderPart.offset = new Point(0, (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2);
      this.attachRenderPart(headRenderPart);
   }
   
   public tick(): void {
      super.tick();

      // Create footsteps
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver() && Board.tickIntervalHasPassed(0.3)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 5);
         this.numFootstepsTaken++;
      }
      this.distanceTracker += this.velocity.length() / SETTINGS.TPS;
      if (this.distanceTracker > 40) {
         this.distanceTracker -= 40;
         this.createFootstepSound();
      }

      if (this.grazeProgress !== -1 && Board.tickIntervalHasPassed(0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createDirtParticle(spawnPositionX, spawnPositionY);
      }

      if (Math.random() < 0.1 / SETTINGS.TPS) {
         playSound(("cow-ambient-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.2, 1, this.position.x, this.position.y);
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particles
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(this.position.x, this.position.y, 20);
      }
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + 32 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + 32 * Math.cos(offsetDirection);
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }

      playSound(("cow-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      for (let i = 0; i < 3; i++) {
         createBloodPoolParticle(this.position.x, this.position.y, 35);
      }

      createBloodParticleFountain(this, Cow.BLOOD_FOUNTAIN_INTERVAL, 1.1);

      playSound("cow-die-1.mp3", 0.2, 1, this.position.x, this.position.y);
   }

   public updateFromData(entityData: EntityData<EntityType.cow>): void {
      super.updateFromData(entityData);

      // When the cow has finished grazing, create a bunch of dirt particles
      if (entityData.clientArgs[1] < this.grazeProgress) {
         for (let i = 0; i < 15; i++) {
            const x = (this.tile.x + Math.random()) * SETTINGS.TILE_SIZE;
            const y = (this.tile.y + Math.random()) * SETTINGS.TILE_SIZE;
            createDirtParticle(x, y);
         }
      }
      this.grazeProgress = entityData.clientArgs[1];
   }
}

export default Cow;