import { Point, InventoryData, EntityData, randFloat, lerp } from "webgl-test-shared";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { Inventory } from "../items/Item";
import { createInventoryFromData } from "../items/item-creation";
import Entity from "./Entity";
import Board from "../Board";
import Particle from "../Particle";
import { ParticleRenderLayer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";

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
      if (this.heatingProgress !== -1) {
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
            // @Incomplete
            // scale: (age: number): number => {
            //    const deathProgress = age / lifetime
            //    return 1 + deathProgress * 2;
            // },

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
               [0, 0, 0]
            );
            Board.highTexturedParticles.push(particle);
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