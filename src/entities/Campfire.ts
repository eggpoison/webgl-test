import { EntityData, EntityType, HitboxType, InventoryData, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { Inventory } from "../items/Item";
import { createInventoryFromData } from "../items/item-creation";

class Campfire extends Entity {
   private static readonly SIZE = 104;

   public type: EntityType = "campfire";

   public fuelInventory: Inventory;
   public ingredientInventory: Inventory;
   public outputInventory: Inventory;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, fuelInventory: InventoryData, ingredientInventory: InventoryData, outputInventory: InventoryData) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: Campfire.SIZE,
            height: Campfire.SIZE,
            textureSource: "entities/campfire/campfire.png",
            zIndex: 0
         }, this)
      ]);

      this.fuelInventory = createInventoryFromData(this, fuelInventory);
      this.ingredientInventory = createInventoryFromData(this, ingredientInventory);
      this.outputInventory = createInventoryFromData(this, outputInventory);
   }

   public updateFromData(entityData: EntityData<"campfire">): void {
      super.updateFromData(entityData);

      this.fuelInventory = createInventoryFromData(this, entityData.clientArgs[0]);
      this.ingredientInventory = createInventoryFromData(this, entityData.clientArgs[1]);
      this.outputInventory = createInventoryFromData(this, entityData.clientArgs[2]);
   }
}

export default Campfire;