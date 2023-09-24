import { EntityType, InventoryData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import CookingEntity from "./CookingEntity";

class Campfire extends CookingEntity {
   private static readonly SIZE = 104;

   public type: EntityType = "campfire";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number) {
      super(position, hitboxes, id, fuelInventory, ingredientInventory, outputInventory, heatingProgress);

      this.attachRenderPart(
         new RenderPart(
            Campfire.SIZE,
            Campfire.SIZE,
            "entities/campfire/campfire.png",
            0,
            0
         )
      );
   }
}

export default Campfire;