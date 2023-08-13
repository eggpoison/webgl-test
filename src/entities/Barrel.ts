import { EntityData, HitboxType, InventoryData, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { Inventory, ItemSlots } from "../items/Item";
import { createItem } from "../items/item-creation";

class Barrel extends Entity {
   private static readonly RADIUS = 40;

   public type = "barrel" as const;

   public readonly inventory: Inventory;

   public tribeID: number | null;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeID: number | null, inventoryData: InventoryData) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: Barrel.RADIUS * 2,
            height: Barrel.RADIUS * 2,
            textureSource: "entities/barrel/barrel.png",
            zIndex: 0
         }, this)
      ]);

      this.inventory = this.createInventoryFromData(inventoryData);

      this.tribeID = tribeID;
   }

   private createInventoryFromData(inventoryData: InventoryData): Inventory {
      const itemSlots: ItemSlots = {};
      for (const [itemSlot, itemData] of Object.entries(inventoryData.itemSlots)) {
         const item = createItem(itemData.type, itemData.count, itemData.id);
         itemSlots[Number(itemSlot)] = item;
      }
      
      const inventory: Inventory = {
         itemSlots: itemSlots,
         width: inventoryData.width,
         height: inventoryData.height,
         inventoryName: "inventory"
      };

      return inventory;
   }

   public updateFromData(entityData: EntityData<"barrel">): void {
      super.updateFromData(entityData);

      this.tribeID = entityData.clientArgs[0];
      
      // Update inventory from data
      const inventoryData = entityData.clientArgs[1];
      const itemSlots: ItemSlots = {};
      for (const [itemSlot, itemData] of Object.entries(inventoryData.itemSlots)) {
         const item = createItem(itemData.type, itemData.count, itemData.id);
         itemSlots[Number(itemSlot)] = item;
      }
      this.inventory.itemSlots = itemSlots;
   }
}

export default Barrel;