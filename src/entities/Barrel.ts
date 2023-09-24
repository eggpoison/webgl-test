import { EntityData, InventoryData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { Inventory, ItemSlots } from "../items/Item";
import { createItem } from "../items/item-creation";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Barrel extends Entity {
   private static readonly RADIUS = 40;

   public type = "barrel" as const;

   public readonly inventory: Inventory;

   public tribeID: number | null;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, tribeID: number | null, inventoryData: InventoryData) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            Barrel.RADIUS * 2,
            Barrel.RADIUS * 2,
            "entities/barrel/barrel.png",
            0,
            0
         )
      );

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