import { Point, InventoryData, EntityData, randFloat, lerp, randItem } from "webgl-test-shared";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { Inventory } from "../items/Item";
import { createInventoryFromData } from "../items/item-creation";
import Entity from "./Entity";
import Board from "../Board";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";

abstract class CookingEntity extends Entity {
   public fuelInventory: Inventory;
   public ingredientInventory: Inventory;
   public outputInventory: Inventory;
   private heatingProgress: number;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number) {
      super(position, hitboxes, id);

      this.fuelInventory = createInventoryFromData(fuelInventory);
      this.ingredientInventory = createInventoryFromData(ingredientInventory);
      this.outputInventory = createInventoryFromData(outputInventory);
      this.heatingProgress = heatingProgress;
   }

   public tick(): void {
      super.tick();
      
      if (this.heatingProgress !== -1) {
         // Smoke particles
         if (Board.tickIntervalHasPassed(0.1)) {
            const spawnPosition = this.position.copy();
            const offset = Point.fromVectorForm(20 * Math.random(), 2 * Math.PI * Math.random());
            spawnPosition.add(offset);

            const velocity = Point.fromVectorForm(30, 0);

            const acceleration = Point.fromVectorForm(80, 0);
            
            const lifetime = 1.5;
            
            const particle = new Particle(lifetime);
            particle.getOpacity = (): number => {
               return lerp(0.5, 0, particle.age / lifetime);
            }
            particle.getScale = (): number => {
               const deathProgress = particle.age / lifetime
               return 1 + deathProgress * 2;
            }

            addTexturedParticleToBufferContainer(
               particle,
               ParticleRenderLayer.high,
               64, 64,
               spawnPosition.x, spawnPosition.y,
               velocity.x, velocity.y,
               acceleration.x, acceleration.y,
               0,
               2 * Math.PI * Math.random(),
               0,
               0.75 * Math.PI * randFloat(-1, 1),
               0,
               5,
               0, 0, 0
            );
            Board.highTexturedParticles.push(particle);
         }

         // Ember particles
         if (Board.tickIntervalHasPassed(0.05)) {
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
      }
   }

   public updateFromData(entityData: EntityData<"campfire" | "furnace">): void {
      super.updateFromData(entityData);

      this.fuelInventory = createInventoryFromData(entityData.clientArgs[0]);
      this.ingredientInventory = createInventoryFromData(entityData.clientArgs[1]);
      this.outputInventory = createInventoryFromData(entityData.clientArgs[2]);
      this.heatingProgress = entityData.clientArgs[3];
   }
}

export default CookingEntity;