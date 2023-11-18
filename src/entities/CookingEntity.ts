import { Point, InventoryData, EntityData } from "webgl-test-shared";
import { Inventory } from "../items/Item";
import Entity from "./Entity";
import { createInventoryFromData } from "../inventory-manipulation";

abstract class CookingEntity extends Entity {
   public fuelInventory: Inventory;
   public ingredientInventory: Inventory;
   public outputInventory: Inventory;
   public heatingProgress: number;
   public isCooking: boolean

   constructor(position: Point, id: number, renderDepth: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number, isCooking: boolean) {
      super(position, id, renderDepth);

      this.fuelInventory = createInventoryFromData(fuelInventory);
      this.ingredientInventory = createInventoryFromData(ingredientInventory);
      this.outputInventory = createInventoryFromData(outputInventory);
      this.heatingProgress = heatingProgress;
      this.isCooking = isCooking;
   }

   public updateFromData(entityData: EntityData<"campfire" | "furnace">): void {
      super.updateFromData(entityData);

      this.fuelInventory = createInventoryFromData(entityData.clientArgs[0]);
      this.ingredientInventory = createInventoryFromData(entityData.clientArgs[1]);
      this.outputInventory = createInventoryFromData(entityData.clientArgs[2]);
      this.heatingProgress = entityData.clientArgs[3];
      this.isCooking = entityData.clientArgs[4];
   }
}

export default CookingEntity;