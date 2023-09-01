import { EntityData, EntityType, InventoryData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { Inventory } from "../items/Item";
import { createInventoryFromData } from "../items/item-creation";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Furnace extends Entity {
   private static readonly SIZE = 80;

   public type: EntityType = "furnace";

   public fuelInventory: Inventory;
   public ingredientInventory: Inventory;
   public outputInventory: Inventory;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: Furnace.SIZE,
            height: Furnace.SIZE,
            textureSource: "entities/furnace/furnace.png",
            zIndex: 0
         })
      ]);

      this.fuelInventory = createInventoryFromData(fuelInventory);
      this.ingredientInventory = createInventoryFromData(ingredientInventory);
      this.outputInventory = createInventoryFromData(outputInventory);
   }

   public updateFromData(entityData: EntityData<"furnace">): void {
      super.updateFromData(entityData);

      this.fuelInventory = createInventoryFromData(entityData.clientArgs[0]);
      this.ingredientInventory = createInventoryFromData(entityData.clientArgs[1]);
      this.outputInventory = createInventoryFromData(entityData.clientArgs[2]);
   }
}

export default Furnace;