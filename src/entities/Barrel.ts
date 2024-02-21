import { EntityData, EntityType, Inventory, InventoryData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playBuildingHitSound, playSound } from "../sound";

class Barrel extends Entity {
   public static readonly SIZE = 80;

   public readonly inventory: Inventory;

   public tribeID: number | null;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, tribeID: number | null, inventoryData: InventoryData) {
      super(position, id, EntityType.barrel, ageTicks, renderDepth);

      this.inventory = createInventoryFromData(inventoryData);
      this.tribeID = tribeID;

      this.attachRenderPart(
         new RenderPart(
            this,
            getEntityTextureArrayIndex("entities/barrel/barrel.png"),
            0,
            0
         )
      );

      if (ageTicks === 0) {
         playSound("barrel-place.mp3", 0.4, 1, this.position.x, this.position.y);
      }
   }

   public updateFromData(entityData: EntityData<EntityType.barrel>): void {
      super.updateFromData(entityData);

      this.tribeID = entityData.clientArgs[0];
      
      updateInventoryFromData(this.inventory, entityData.clientArgs[1]);
   }

   protected onHit(): void {
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Barrel;