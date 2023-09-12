import { EntityData, EntityType, HitData, ParticleColour, Point, SETTINGS, StatusEffectData, StatusEffectType, Vector, lerp, randFloat, randItem } from "webgl-test-shared";
import GameObject from "../GameObject";
import TexturedParticle from "../particles/TexturedParticle";
import MonocolourParticle from "../particles/MonocolourParticle";
import { ParticleRenderLayer } from "../particles/Particle";
import Board from "../Board";

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

      const poisonStatusEffect = this.getStatusEffect("poisoned");
      if (poisonStatusEffect !== null) {
         if (poisonStatusEffect.ticksElapsed % 2 === 0) {
            const spawnPosition = Point.fromVectorForm(30 * Math.random(), 2 * Math.PI * Math.random());
            spawnPosition.add(this.position);

            const lifetime = 2;
            
            const particle = new TexturedParticle(
               null,
               12,
               12,
               spawnPosition,
               null,
               null,
               lifetime,
               "particles/poison-droplet.png"
            );
            particle.rotation = 2 * Math.PI * Math.random();
            particle.getOpacity = (age: number) => {
               return lerp(0.75, 0, age / lifetime);
            }
            Board.addTexturedParticle(particle, ParticleRenderLayer.low);
         }
      }

      const fireStatusEffect = this.getStatusEffect("burning");
      if (fireStatusEffect !== null) {
         // Embers
         if (fireStatusEffect.ticksElapsed % 2 === 0) {
            const spawnPosition = Point.fromVectorForm(30 * Math.random(), 2 * Math.PI * Math.random());
            spawnPosition.add(this.position);

            const lifetime = randFloat(0.6, 1.2);

            const velocity = new Vector(randFloat(100, 140), 2 * Math.PI * Math.random());
            const velocityOffset = new Vector(30, Math.PI);
            velocity.add(velocityOffset);
            
            const particle = new MonocolourParticle(
               null,
               4,
               4,
               spawnPosition,
               velocity,
               new Vector(randFloat(0, 80), 2 * Math.PI * Math.random()),
               lifetime,
               randItem(Entity.BURNING_PARTICLE_COLOURS)
            );
            particle.rotation = 2 * Math.PI * Math.random();
            particle.getOpacity = (age: number): number => {
               const opacity = 1 - age / lifetime;
               return Math.pow(opacity, 0.3);
            }
            Board.addMonocolourParticle(particle, ParticleRenderLayer.high);
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
      if (typeof this.onHit !== "undefined") {
         this.onHit(hitData);
      }

      this.secondsSinceLastHit = 0;
   }

   public onDie?(): void;
}

export default Entity;