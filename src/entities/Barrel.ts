import { EntityData, EntityType, InventoryData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { Inventory } from "../items/Item";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class Barrel extends Entity {
   public static readonly SIZE = 80;

   public type = EntityType.barrel;

   public readonly inventory: Inventory;

   public tribeID: number | null;

   constructor(position: Point, id: number, renderDepth: number, tribeID: number | null, inventoryData: InventoryData) {
      super(position, id, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            Barrel.SIZE,
            Barrel.SIZE,
            getGameObjectTextureArrayIndex("entities/barrel/barrel.png"),
            0,
            0
         )
      );

      this.inventory = createInventoryFromData(inventoryData);

      this.tribeID = tribeID;
   }

   public updateFromData(entityData: EntityData<EntityType.barrel>): void {
      super.updateFromData(entityData);

      this.tribeID = entityData.clientArgs[0];
      
      updateInventoryFromData(this.inventory, entityData.clientArgs[1]);
   }
}

export default Barrel;