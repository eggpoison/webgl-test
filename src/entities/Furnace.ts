import { EntityData, EntityType, HitboxType, InventoryData, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { Inventory } from "../items/Item";
import { createInventoryFromData } from "../items/item-creation";

class Furnace extends Entity {
   private static readonly SIZE = 80;

   public type: EntityType = "furnace";

   public fuelInventory: Inventory;
   public outputInventory: Inventory;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, fuelInventory: InventoryData, outputInventory: InventoryData) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: Furnace.SIZE,
            height: Furnace.SIZE,
            textureSource: "entities/furnace/furnace.png",
            zIndex: 0
         }, this)
      ]);

      this.fuelInventory = createInventoryFromData(this, fuelInventory);
      this.outputInventory = createInventoryFromData(this, outputInventory);
   }

   public updateFromData(entityData: EntityData<"furnace">): void {
      super.updateFromData(entityData);

      this.fuelInventory = createInventoryFromData(this, entityData.clientArgs[0]);
      this.outputInventory = createInventoryFromData(this, entityData.clientArgs[1]);
   }
}

export default Furnace;