import { EntityData, EntityType, HitData, HitFlags, SETTINGS, StatusEffectData, StatusEffectType, lerp, randFloat, randItem } from "webgl-test-shared";
import GameObject from "../GameObject";
import Particle from "../Particle";
import Board from "../Board";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";

// Use prime numbers / 100 to ensure a decent distribution of different types of particles
const HEALING_PARTICLE_AMOUNTS = [0.02, 0.13, 0.41];
const HEALING_PARTICLE_TEXTURE_INDEXES = [3 * 8 + 1, 3 * 8 + 2, 3 * 8 + 3];

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

   public mobAIType?: string;

   public statusEffects = new Array<StatusEffectData>();

   public tick(): void {
      super.tick();

      this.secondsSinceLastHit += 1 / SETTINGS.TPS;

      // Water splash particles
      // @Incomplete
      if (this.isInRiver() && Board.tickIntervalHasPassed(0.15) && this.acceleration !== null) {
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
      }
      
      const poisonStatusEffect = this.getStatusEffect("poisoned");
      if (poisonStatusEffect !== null) {
         // Poison particles
         if (poisonStatusEffect.ticksElapsed % 2 === 0) {
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
      }

      const fireStatusEffect = this.getStatusEffect("burning");
      if (fireStatusEffect !== null) {
         // Ember particles
         if (fireStatusEffect.ticksElapsed % 2 === 0) {
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
         if (fireStatusEffect.ticksElapsed % 3 === 0) {
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
      }
   }

   public hasStatusEffect(type: StatusEffectType): boolean {
      for (const statusEffect of this.statusEffects) {
         if (statusEffect.type === type) {
            return true;
         }
      }
      return false;
   }

   private getStatusEffect(type: StatusEffectType): StatusEffectData | null {
      for (const statusEffect of this.statusEffects) {
         if (statusEffect.type === type) {
            return statusEffect;
         }
      }
      return null;
   }

   public updateFromData(entityData: EntityData<EntityType>): void {
      super.updateFromData(entityData);

      this.mobAIType = entityData.mobAIType;
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

   protected onHit?(hitData: HitData): void;

   public registerHit(hitData: HitData): void {
      // If the entity is hit by a flesh sword, create slime puddles
      if (hitData.flags & HitFlags.HIT_BY_FLESH_SWORD) {
         const spawnOffsetMagnitude = 30 * Math.random()
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
   
         const lifetime = 7.5;

         const particle = new Particle(lifetime);
         particle.getOpacity = (): number => {
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
            8 * 1 + 4,
            0, 0, 0
         );
         Board.lowTexturedParticles.push(particle);
      }
      
      if (typeof this.onHit !== "undefined") {
         this.onHit(hitData);
      }

      this.secondsSinceLastHit = 0;
   }

   public onDie?(): void;
}

export default Entity;