import { EntityType, InventoryData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import CookingEntity from "./CookingEntity";

class Furnace extends CookingEntity {
   public static readonly SIZE = 80;

   public type: EntityType = "furnace";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number) {
      super(position, hitboxes, id, fuelInventory, ingredientInventory, outputInventory, heatingProgress);

      this.attachRenderPart(
         new RenderPart(
            this,
            Furnace.SIZE,
            Furnace.SIZE,
            "entities/furnace/furnace.png",
            0,
            0
         )
      );
   }
}

export default Furnace;