import { EntityData, HitboxType, InventoryData, Point, TribeType } from "webgl-test-shared";
import TribeMember from "./TribeMember";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import { Inventory, ItemSlots } from "../items/Item";
import { createItem } from "../items/item-creation";

class Tribesman extends TribeMember {
   public readonly type = "tribesman";

   private static readonly RADIUS = 32;

   public readonly inventory: Inventory;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeType: TribeType, inventoryData: InventoryData) {
      super(position, hitboxes, id, secondsSinceLastHit, tribeType);

      this.attachRenderParts([
         new RenderPart({
            width: Tribesman.RADIUS * 2,
            height: Tribesman.RADIUS * 2,
            textureSource: super.getTextureSource(tribeType),
            zIndex: 0
         }, this)
      ]);

      this.inventory = this.createInventoryFromData(inventoryData);
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
         entityID: this.id,
         inventoryName: "inventory"
      };

      return inventory;
   }

   public updateFromData(entityData: EntityData<"tribesman">): void {
      super.updateFromData(entityData);

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

export default Tribesman;