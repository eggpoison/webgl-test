import { EntityData, EntityType, HitData, HitFlags, Point, SETTINGS, StatusEffectData, StatusEffectType, lerp, randFloat, randItem } from "webgl-test-shared";
import GameObject from "../GameObject";
import TexturedParticle from "../particles/TexturedParticle";
import MonocolourParticle from "../particles/MonocolourParticle";
import { ParticleRenderLayer } from "../particles/Particle";
import Board from "../Board";
import { ParticleColour, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";

abstract class Entity extends GameObject {
   private static readonly BURNING_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [
      [255/255, 102/255, 0],
      [255/255, 184/255, 61/255]
   ];
   
   public abstract readonly type: EntityType;

   public secondsSinceLastHit = 99999;

   public mobAIType?: string;

   public statusEffects = new Array<StatusEffectData>();

   public tick(): void {
      super.tick();

      this.secondsSinceLastHit += 1 / SETTINGS.TPS;

      // Water splash particles
      // @Incomplete
      if (this.isInRiver(this.findCurrentTile()) && Board.tickIntervalHasPassed(0.15) && this.acceleration !== null) {
         const lifetime = 1.5;

         const particle = new TexturedParticle(lifetime);
         particle.getOpacity = (age: number): number => {
            return lerp(0.75, 0, age / lifetime);
         }

         addTexturedParticleToBufferContainer(particle, 64, 64, this.position.x, this.position.y, 0, 0, 0, 0, 8 * 1 + 5, 2 * Math.PI * Math.random(), 0, 0);
         Board.addTexturedParticle(particle, ParticleRenderLayer.low);
      }
      
      const poisonStatusEffect = this.getStatusEffect("poisoned");
      if (poisonStatusEffect !== null) {
         // Poison particles
         if (poisonStatusEffect.ticksElapsed % 2 === 0) {
            // @Speed garbage collection
            const spawnPosition = Point.fromVectorForm(30 * Math.random(), 2 * Math.PI * Math.random());
            spawnPosition.add(this.position);

            const lifetime = 2;
            
            const particle = new TexturedParticle(lifetime);
            particle.getOpacity = (age: number) => {
               return lerp(0.75, 0, age / lifetime);
            }

            // @Incomplete
            addTexturedParticleToBufferContainer(particle, 64, 64, spawnPosition.x, spawnPosition.y, 0, 0, 0, 0, 6, 2 * Math.PI * Math.random(), 0, 0);
            Board.addTexturedParticle(particle, ParticleRenderLayer.low);
         }
      }

      const fireStatusEffect = this.getStatusEffect("burning");
      if (fireStatusEffect !== null) {
         // Ember particles
         if (fireStatusEffect.ticksElapsed % 2 === 0) {
            // @Speed garbage collection
            const spawnPosition = Point.fromVectorForm(30 * Math.random(), 2 * Math.PI * Math.random());
            spawnPosition.add(this.position);

            const lifetime = randFloat(0.6, 1.2);

            const velocity = Point.fromVectorForm(randFloat(100, 140), 2 * Math.PI * Math.random());
            const velocityOffset = Point.fromVectorForm(30, Math.PI);
            velocity.add(velocityOffset);

            const acceleration = Point.fromVectorForm(randFloat(0, 80), 2 * Math.PI * Math.random());
            
            const particle = new MonocolourParticle(lifetime);
            particle.getOpacity = (age: number): number => {
               const opacity = 1 - age / lifetime;
               return Math.pow(opacity, 0.3);
            }

            // @Incomplete
            addMonocolourParticleToBufferContainer(particle, 4, 4, spawnPosition.x, spawnPosition.y, velocity.x, velocity.y, acceleration.x, acceleration.y, 2 * Math.PI * Math.random(), 0, 0, randItem(Entity.BURNING_PARTICLE_COLOURS));
            Board.addMonocolourParticle(particle, ParticleRenderLayer.high);
         }

         // Smoke particles
         if (fireStatusEffect.ticksElapsed % 2 === 0) {
            const spawnPosition = this.position.copy();
            const offset = Point.fromVectorForm(20 * Math.random(), 2 * Math.PI * Math.random());
            spawnPosition.add(offset);

            const acceleration = Point.fromVectorForm(40, Math.random());

            const lifetime = randFloat(1, 1.25);

            const fadeInTime = 0.15;

            const particle = new TexturedParticle(lifetime);
            particle.getOpacity = (age: number): number => {
               if (age <= fadeInTime) {
                  return age / fadeInTime;
               }
               return lerp(0.75, 0, (age - fadeInTime) / (lifetime - fadeInTime));
            }
            // @Incomplete
            // scale: (age: number): number => {
            //    const deathProgress = age / lifetime
            //    return 1 + deathProgress * 2;
            // },

            addTexturedParticleToBufferContainer(particle, 64, 64, spawnPosition.x, spawnPosition.y, 0, 30, acceleration.x, acceleration.y, 5, 2 * Math.PI * Math.random(), 0, 0);
            Board.addTexturedParticle(particle, ParticleRenderLayer.high);
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

   protected onHit?(hitData: HitData): void;

   public registerHit(hitData: HitData): void {
      // If the entity is hit by a flesh sword, create slime puddles
      if (hitData.flags & HitFlags.HIT_BY_FLESH_SWORD) {
         // @Speed garbage collection
         
         const spawnPosition = this.position.copy();
         const offset = Point.fromVectorForm(30 * Math.random(), 2 * Math.PI * Math.random());
         spawnPosition.add(offset);
   
         const lifetime = 7.5;

         const particle = new TexturedParticle(lifetime);
         particle.getOpacity = (age: number): number => {
            return lerp(0.75, 0, age / lifetime);
         }

         addTexturedParticleToBufferContainer(particle, 64, 64, spawnPosition.x, spawnPosition.y, 0, 0, 0, 0, 8 * 1 + 4, 2 * Math.PI * Math.random(), 0, 0);
         Board.addTexturedParticle(particle, ParticleRenderLayer.low);
      }
      
      if (typeof this.onHit !== "undefined") {
         this.onHit(hitData);
      }

      this.secondsSinceLastHit = 0;
   }

   public onDie?(): void;
}

export default Entity;