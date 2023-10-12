import { EntityData, InventoryData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { Inventory } from "../items/Item";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { getGameObjectTextureIndex } from "../texture-atlases/game-object-texture-atlas";

class Barrel extends Entity {
   public static readonly SIZE = 80;

   public type = "barrel" as const;

   public readonly inventory: Inventory;

   public tribeID: number | null;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, tribeID: number | null, inventoryData: InventoryData) {
      super(position, hitboxes, id, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            Barrel.SIZE,
            Barrel.SIZE,
            getGameObjectTextureIndex("entities/barrel/barrel.png"),
            0,
            0
         )
      );

      this.inventory = createInventoryFromData(inventoryData);

      this.tribeID = tribeID;
   }

   public updateFromData(entityData: EntityData<"barrel">): void {
      super.updateFromData(entityData);

      this.tribeID = entityData.clientArgs[0];
      
      updateInventoryFromData(this.inventory, entityData.clientArgs[1]);
   }
}

export default Barrel;