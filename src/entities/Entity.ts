import { EntityType, SETTINGS, StatusEffect, lerp, randFloat, randItem, customTickIntervalHasPassed, TileType, randInt } from "webgl-test-shared";
import GameObject from "../GameObject";
import Particle from "../Particle";
import Board, { Light } from "../Board";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";
import { BloodParticleSize, createBloodParticle, createPoisonBubble } from "../generic-particles";
import { AudioFilePath, playSound } from "../sound";

// Use prime numbers / 100 to ensure a decent distribution of different types of particles
const HEALING_PARTICLE_AMOUNTS = [0.05, 0.37, 1.01];
const HEALING_PARTICLE_TEXTURE_INDEXES = [3 * 8 + 1, 3 * 8 + 2, 3 * 8 + 3];

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

const createHealingParticle = (originX: number, originY: number, size: number): void => {
   const offsetMagnitude = 40 * Math.random();
   const offsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offsetMagnitude * Math.sin(offsetDirection);
   const spawnPositionY = originY + offsetMagnitude * Math.cos(offsetDirection);

   const moveSpeed = randFloat(20, 30);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);
   
   const lifetime = randFloat(0.8, 1.2);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   }

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      0,
      0,
      0,
      0,
      HEALING_PARTICLE_TEXTURE_INDEXES[size],
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}

abstract class Entity extends GameObject {
   public static readonly BURNING_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [
      [255/255, 102/255, 0],
      [255/255, 184/255, 61/255]
   ];

   private static readonly BURNING_SMOKE_PARTICLE_FADEIN_TIME = 0.15;
   
   public abstract readonly type: EntityType;

   public secondsSinceLastHit = 99999;

   private burningLight: Light | null = null;

   public tick(): void {
      super.tick();

      if (this.hasStatusEffect(StatusEffect.freezing)) {
         this.tintB += 0.5;
         this.tintR -= 0.15;
      }

      let redness: number;
      if (this.secondsSinceLastHit === null || this.secondsSinceLastHit > ATTACK_HIT_FLASH_DURATION) {
         redness = 0;
      } else {
         redness = MAX_REDNESS * (1 - this.secondsSinceLastHit / ATTACK_HIT_FLASH_DURATION);
      }

      this.tintR = lerp(this.tintR, 1, redness);
      this.tintG = lerp(this.tintG, -1, redness);
      this.tintB = lerp(this.tintB, -1, redness);

      this.secondsSinceLastHit += 1 / SETTINGS.TPS;

      // Water splash particles
      if (this.isInRiver() && Board.tickIntervalHasPassed(0.15) && this.acceleration !== null && this.type !== EntityType.fish) {
         const lifetime = 1.5;

         const particle = new Particle(lifetime);
         particle.getOpacity = (): number => {
            return lerp(0.75, 0, particle.age / lifetime);
         }
         particle.getScale = (): number => {
            return 1 + particle.age / lifetime;
         }

         addTexturedParticleToBufferContainer(
            particle,
            ParticleRenderLayer.low,
            64, 64,
            this.position.x, this.position.y,
            0, 0,
            0, 0,
            0,
            2 * Math.PI * Math.random(),
            0,
            0,
            0,
            8 * 1 + 5,
            0, 0, 0
         );
         Board.lowTexturedParticles.push(particle);

         playSound(("water-splash-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.25, this.position.x, this.position.y);
      }
      
      const poisonStatusEffect = this.getStatusEffect(StatusEffect.poisoned);
      if (poisonStatusEffect !== null) {
         // Poison particles
         if (customTickIntervalHasPassed(poisonStatusEffect.ticksElapsed, 0.1)) {
            const spawnOffsetMagnitude = 30 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random()
            const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            const lifetime = 2;
            
            const particle = new Particle(lifetime);
            particle.getOpacity = () => {
               return lerp(0.75, 0, particle.age / lifetime);
            }

            addTexturedParticleToBufferContainer(
               particle,
               ParticleRenderLayer.low,
               64, 64,
               spawnPositionX, spawnPositionY,
               0, 0,
               0, 0,
               0,
               2 * Math.PI * Math.random(),
               0,
               0,
               0,
               6,
               0, 0, 0
            );
            Board.lowTexturedParticles.push(particle);
         }

         // Poison bubbles
         if (customTickIntervalHasPassed(poisonStatusEffect.ticksElapsed, 0.1)) {
            const spawnOffsetMagnitude = 30 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random()
            const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            createPoisonBubble(spawnPositionX, spawnPositionY, randFloat(0.4, 0.6));
         }
      }

      const fireStatusEffect = this.getStatusEffect(StatusEffect.burning);
      if (fireStatusEffect !== null) {
         if (this.burningLight === null) {
            this.burningLight = {
               position: this.position,
               intensity: 1,
               strength: 2.5,
               radius: 0.3,
               r: 0,
               g: 0,
               b: 0
            };
            Board.lights.push(this.burningLight);
         }
         
         // Ember particles
         if (customTickIntervalHasPassed(fireStatusEffect.ticksElapsed, 0.1)) {
            const spawnOffsetMagnitude = 30 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            const lifetime = randFloat(0.6, 1.2);

            const velocityMagnitude = randFloat(100, 140);
            const velocityDirection = 2 * Math.PI * Math.random();
            const velocityX = velocityMagnitude * Math.sin(velocityDirection);
            const velocityY = velocityMagnitude * Math.cos(velocityDirection);

            const accelerationMagnitude = randFloat(0, 80);
            const accelerationDirection = 2 * Math.PI * Math.random();
            const accelerationX = accelerationMagnitude * Math.sin(accelerationDirection);
            const accelerationY = accelerationDirection * Math.cos(accelerationDirection);
            
            const particle = new Particle(lifetime);
            particle.getOpacity = (): number => {
               const opacity = 1 - particle.age / lifetime;
               return Math.pow(opacity, 0.3);
            }

            const colour = randItem(Entity.BURNING_PARTICLE_COLOURS);

            addMonocolourParticleToBufferContainer(
               particle,
               ParticleRenderLayer.high,
               4, 4,
               spawnPositionX, spawnPositionY,
               velocityX, velocityY,
               accelerationX, accelerationY,
               0,
               2 * Math.PI * Math.random(),
               0, 
               0,
               0,
               colour[0], colour[1], colour[2]
            );
            Board.highMonocolourParticles.push(particle);
         }

         // Smoke particles
         if (customTickIntervalHasPassed(fireStatusEffect.ticksElapsed, 3/20)) {
            const spawnOffsetMagnitude = 20 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            const accelerationDirection = 2 * Math.PI * Math.random();
            const accelerationX = 40 * Math.sin(accelerationDirection);
            let accelerationY = 40 * Math.cos(accelerationDirection);

            // Weight the smoke to accelerate more upwards
            accelerationY += 10;

            const lifetime = randFloat(1.75, 2.25);

            const particle = new Particle(lifetime);
            particle.getOpacity = (): number => {
               if (particle.age <= Entity.BURNING_SMOKE_PARTICLE_FADEIN_TIME) {
                  return particle.age / Entity.BURNING_SMOKE_PARTICLE_FADEIN_TIME;
               }
               return lerp(0.75, 0, (particle.age - Entity.BURNING_SMOKE_PARTICLE_FADEIN_TIME) / (lifetime - Entity.BURNING_SMOKE_PARTICLE_FADEIN_TIME));
            }
            particle.getScale = (): number => {
               const deathProgress = particle.age / lifetime
               return 1 + deathProgress * 1.5;
            }

            addTexturedParticleToBufferContainer(
               particle,
               ParticleRenderLayer.high,
               64, 64,
               spawnPositionX, spawnPositionY,
               0, 50,
               accelerationX, accelerationY,
               0,
               2 * Math.PI * Math.random(),
               randFloat(-Math.PI, Math.PI),
               randFloat(-Math.PI, Math.PI) / 2,
               0,
               5,
               0, 0, 0
            );
            Board.highTexturedParticles.push(particle);
         }
      } else if (this.burningLight !== null) {
         const idx = Board.lights.indexOf(this.burningLight);
         if (idx !== -1) {
            Board.lights.splice(idx, 1);
         }
         this.burningLight = null;
      }

      const bleedingStatusEffect = this.getStatusEffect(StatusEffect.bleeding);
      if (bleedingStatusEffect !== null) {
         if (Board.tickIntervalHasPassed(0.15)) {
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = this.position.x + 32 * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.position.y + 32 * Math.cos(spawnOffsetDirection);
            createBloodParticle(Math.random() < 0.5 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(40, 60), true);
         }
      }
   }

   public createHealingParticles(amountHealed: number): void {
      // Create healing particles depending on the amount the entity was healed
      let remainingHealing = amountHealed;
      for (let size = 2; size >= 0;) {
         if (remainingHealing >= HEALING_PARTICLE_AMOUNTS[size]) {
            createHealingParticle(this.position.x, this.position.y, size);
            remainingHealing -= HEALING_PARTICLE_AMOUNTS[size];
         } else {
            size--;
         }
      }
   }

   public onRemove(): void {
      if (this.burningLight !== null) {
         const idx = Board.lights.indexOf(this.burningLight);
         if (idx !== -1) {
            Board.lights.splice(idx, 1);
         }
      }
   }

   protected createFootstepSound(): void {
      switch (this.tile.type) {
         case TileType.grass: {
            playSound(("grass-walk-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.04, this.position.x, this.position.y);
            break;
         }
         case TileType.sand: {
            playSound(("sand-walk-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.02, this.position.x, this.position.y);
            break;
         }
         case TileType.snow: {
            playSound(("snow-walk-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.07, this.position.x, this.position.y);
            break;
         }
         case TileType.rock: {
            playSound(("rock-walk-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.08, this.position.x, this.position.y);
            break;
         }
         case TileType.water: {
            if (!this.isInRiver()) {
               playSound(("rock-walk-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.08, this.position.x, this.position.y);
            }
            break;
         }
      }
   }
}

export default Entity;