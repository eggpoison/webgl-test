import { EntityData, EntityType, ParticleType, Point, ServerEntitySpecialData, StatusEffectData, StatusEffectType, Vector, lerp, randFloat } from "webgl-test-shared";
import Game from "../Game";
import GameObject from "../GameObject";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Particle from "../Particle";

abstract class Entity extends GameObject {
   public abstract readonly type: EntityType;

   public secondsSinceLastHit: number | null;

   public special?: ServerEntitySpecialData;

   public statusEffects = new Array<StatusEffectData>();

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id);
      
      this.secondsSinceLastHit = secondsSinceLastHit;

      // Add entity to the ID record
      Game.board.entities[this.id] = this;
   }

   public tick(): void {
      super.tick();

      const poisonStatusEffect = this.getStatusEffect("poisoned");
      if (poisonStatusEffect !== null) {
         if (poisonStatusEffect.ticksElapsed % 2 === 0) {
            const spawnPosition = this.position.copy();
            const offset = new Vector(30 * Math.random(), 2 * Math.PI * Math.random()).convertToPoint();
            spawnPosition.add(offset);

            const lifetime = 2;
            
            const particle = new Particle(
               null,
               ParticleType.poisonDroplet,
               spawnPosition,
               null,
               null,
               lifetime
            );
            particle.rotation = 2 * Math.PI * Math.random();
            particle.getOpacity = (age: number) => {
               return lerp(0.75, 0, age / lifetime);
            }
         }
      }

      const fireStatusEffect = this.getStatusEffect("fire");
      if (fireStatusEffect !== null) {
         // Embers
         if (fireStatusEffect.ticksElapsed % 3 === 0) {
            const spawnPosition = this.position.copy();
            const offset = new Vector(30 * Math.random(), 2 * Math.PI * Math.random()).convertToPoint();
            spawnPosition.add(offset);

            const lifetime = randFloat(0.6, 1.2);

            const velocity = new Vector(randFloat(100, 140), 2 * Math.PI * Math.random());
            const velocityOffset = new Vector(30, Math.PI);
            velocity.add(velocityOffset);
            
            const particle = new Particle(
               null,
               Math.random() < 0.5 ? ParticleType.emberRed : ParticleType.emberOrange,
               spawnPosition,
               velocity,
               new Vector(randFloat(0, 80), 2 * Math.PI * Math.random()),
               lifetime
            );
            particle.drag = 60;
            particle.rotation = 2 * Math.PI * Math.random();
            particle.getOpacity = (age: number): number => {
               const opacity = 1 - age / lifetime;
               return Math.pow(opacity, 0.3);
            }
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

   public remove(): void {
      delete Game.board.entities[this.id];
   }

   public updateFromData(entityData: EntityData<EntityType>): void {
      super.updateFromData(entityData);

      this.secondsSinceLastHit = entityData.secondsSinceLastHit;
      this.statusEffects = entityData.statusEffects;
      this.special = entityData.special;
   }
}

export default Entity;