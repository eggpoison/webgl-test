import { EntityData, EntityType, HitboxType, InventoryData, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { Inventory } from "../items/Item";
import { createInventoryFromData } from "../items/item-creation";

class Campfire extends Entity {
   private static readonly SIZE = 80;

   public type: EntityType = "campfire";

   public inventory: Inventory;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, inventory: InventoryData) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: Campfire.SIZE,
            height: Campfire.SIZE,
            textureSource: "entities/furnace/furnace.png",
            zIndex: 0
         }, this)
      ]);

      this.inventory = createInventoryFromData(this, inventory);
   }

   public updateFromData(entityData: EntityData<"campfire">): void {
      super.updateFromData(entityData);

      this.inventory = createInventoryFromData(this, entityData.clientArgs[0]);
   }
}

export default Campfire;