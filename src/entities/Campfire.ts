import { EntityType, InventoryData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import CookingEntity from "./CookingEntity";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class Campfire extends CookingEntity {
   public static readonly SIZE = 104;

   public type: EntityType = "campfire";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData, heatingProgress: number) {
      super(position, hitboxes, id, renderDepth, fuelInventory, ingredientInventory, outputInventory, heatingProgress);

      this.attachRenderPart(
         new RenderPart(
            this,
            Campfire.SIZE,
            Campfire.SIZE,
            getGameObjectTextureArrayIndex("entities/campfire/campfire.png"),
            0,
            0
         )
      );
   }
}

export default Campfire;