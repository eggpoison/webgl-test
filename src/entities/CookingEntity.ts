import { Point, InventoryData, EntityData, EntityType, randFloat, Inventory } from "webgl-test-shared";
import Entity from "./Entity";
import { createInventoryFromData } from "../inventory-manipulation";
import Board, { Light } from "../Board";

abstract class CookingEntity extends Entity {
   public fuelInventory: Inventory;
   public ingredientInventory: Inventory;
   public outputInventory: Inventory;
   public heatingProgress: number;
   public isCooking: boolean

   private readonly light: Light;

   constructor(position: Point, id: number, entityType: EntityType, renderDepth: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number, isCooking: boolean) {
      super(position, id, entityType, renderDepth);

      this.fuelInventory = createInventoryFromData(fuelInventory);
      this.ingredientInventory = createInventoryFromData(ingredientInventory);
      this.outputInventory = createInventoryFromData(outputInventory);
      this.heatingProgress = heatingProgress;
      this.isCooking = isCooking;

      this.light = {
         position: this.position,
         intensity: 1,
         strength: 3.5,
         radius: 40,
         r: 0,
         g: 0,
         b: 0
      };
      Board.lights.push(this.light);
   }

   public tick(): void {
      super.tick();

      if (Board.tickIntervalHasPassed(0.15)) {
         this.light.radius = 40 + randFloat(-7, 7);
      }
   }

   public updateFromData(entityData: EntityData<EntityType.campfire | EntityType.furnace>): void {
      super.updateFromData(entityData);

      this.fuelInventory = createInventoryFromData(entityData.clientArgs[0]);
      this.ingredientInventory = createInventoryFromData(entityData.clientArgs[1]);
      this.outputInventory = createInventoryFromData(entityData.clientArgs[2]);
      this.heatingProgress = entityData.clientArgs[3];
      this.isCooking = entityData.clientArgs[4];
   }

   public onRemove(): void {
      super.onRemove();
      
      const idx = Board.lights.indexOf(this.light);
      if (idx !== -1) {
         Board.lights.splice(idx, 1);
      }
   }
}

export default CookingEntity;