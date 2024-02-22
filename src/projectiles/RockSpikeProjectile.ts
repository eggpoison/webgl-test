import { EntityType, Point, SettingsConst, lerp, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import Board from "../Board";
import { createRockParticle } from "../particles";
import GameObject from "../GameObject";

class RockSpikeProjectile extends GameObject {
   private static readonly SIZES = [12 * 4, 16 * 4, 20 * 4];
   private static readonly SPRITE_TEXTURE_SOURCES = [
      "projectiles/rock-spike-small.png",
      "projectiles/rock-spike-medium.png",
      "projectiles/rock-spike-large.png"
   ];

   private static readonly ENTRANCE_SHAKE_AMOUNTS = [2, 3.5, 5];
   private static readonly ENTRANCE_SHAKE_DURATION = 0.5;
   private static readonly ENTRANCE_SCALE = 0.65;

   private static readonly EXIT_SHAKE_DURATION = 0.8;
   private static readonly EXIT_SHAKE_AMOUNTS = [1.25, 2.25, 3.25];

   private readonly size: number;
   private readonly lifetime: number;

   private readonly renderPart: RenderPart;
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, size: number, lifetime: number) {
      super(position, id, EntityType.rockSpikeProjectile, ageTicks, renderDepth);

      this.size = size;
      this.lifetime = lifetime;
      
      this.shakeAmount = RockSpikeProjectile.ENTRANCE_SHAKE_AMOUNTS[this.size];
      
      this.renderPart = new RenderPart(
         this,
         getTextureArrayIndex(RockSpikeProjectile.SPRITE_TEXTURE_SOURCES[this.size]),
         0,
         0
      );
      this.renderPart.scale = RockSpikeProjectile.ENTRANCE_SCALE;
      this.attachRenderPart(this.renderPart);

      // 
      // Create debris particles
      // 

      let numSpeckParticles!: number;
      let numTexturedParticles!: number;
      switch (this.size) {
         case 0: {
            numSpeckParticles = randInt(2, 3);
            numTexturedParticles = randInt(2, 3);
            break;
         }
         case 1: {
            numSpeckParticles = randInt(4, 5);
            numTexturedParticles = randInt(4, 5);
            break;
         }
         case 2: {
            numSpeckParticles = randInt(6, 8);
            numTexturedParticles = randInt(6, 8);
            break;
         }
      }

      for (let i = 0; i < numSpeckParticles; i++) {
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + RockSpikeProjectile.SIZES[this.size] / 2 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + RockSpikeProjectile.SIZES[this.size] / 2 * Math.cos(spawnOffsetDirection);
         
         const lifetime = randFloat(1, 1.2);
      
         const velocityMagnitude = randFloat(60, 100);
         const velocityDirection = spawnOffsetDirection + randFloat(-0.5, 0.5);
         const velocityX = velocityMagnitude * Math.sin(velocityDirection);
         const velocityY = velocityMagnitude * Math.cos(velocityDirection);
         
         const particle = new Particle(lifetime);
         particle.getOpacity = (): number => {
            return 1 - particle.age / lifetime;
         };
      
         const pixelSize = 4 * randInt(1, 2);
      
         const colour = randFloat(0.3, 0.5);
         
         addMonocolourParticleToBufferContainer(
            particle,
            ParticleRenderLayer.low,
            pixelSize, pixelSize,
            spawnPositionX, spawnPositionY,
            velocityX, velocityY,
            0, 0,
            0,
            2 * Math.PI * Math.random(),
            0,
            0,
            0,
            colour, colour, colour
         );
         Board.lowMonocolourParticles.push(particle);
      }

      for (let i = 0; i < numTexturedParticles; i++) {
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + RockSpikeProjectile.SIZES[this.size] / 2 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + RockSpikeProjectile.SIZES[this.size] / 2 * Math.cos(spawnOffsetDirection);

         createRockParticle(spawnPositionX, spawnPositionY, spawnOffsetDirection + randFloat(-0.5, 0.5), randFloat(80, 125));
      }
   }

   public tick(): void {
      super.tick();

      const ageSeconds = this.ageTicks / SettingsConst.TPS;
      if (ageSeconds < RockSpikeProjectile.ENTRANCE_SHAKE_DURATION) {
         // Entrance
         const entranceProgress = ageSeconds / RockSpikeProjectile.ENTRANCE_SHAKE_DURATION;
         this.shakeAmount = lerp(RockSpikeProjectile.ENTRANCE_SHAKE_AMOUNTS[this.size], 0, entranceProgress);
         this.renderPart.scale = lerp(RockSpikeProjectile.ENTRANCE_SCALE, 1, Math.pow(entranceProgress, 0.5));
      } else if (ageSeconds > this.lifetime - RockSpikeProjectile.EXIT_SHAKE_DURATION) {
         // Exit
         const exitProgress = (ageSeconds - (this.lifetime - RockSpikeProjectile.EXIT_SHAKE_DURATION)) / RockSpikeProjectile.EXIT_SHAKE_DURATION;
         this.shakeAmount = lerp(0, RockSpikeProjectile.EXIT_SHAKE_AMOUNTS[this.size], exitProgress);
         this.renderPart.opacity = 1 - Math.pow(exitProgress, 2);
         this.renderPart.scale = 1 - lerp(0, 0.5, Math.pow(exitProgress, 2));
      } else {
         this.shakeAmount = 0;
      }
   }
}

export default RockSpikeProjectile;