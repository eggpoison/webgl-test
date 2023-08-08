import { EntityData, HitboxType, InventoryData, Point, TribeType, Vector } from "webgl-test-shared";
import TribeMember from "./TribeMember";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import { Inventory, ItemSlots } from "../items/Item";
import { createItem } from "../items/item-creation";

class Tribesman extends TribeMember {
   public readonly type = "tribesman";

   private static readonly RADIUS = 32;

   private static readonly GOBLIN_EAR_WIDTH = 20;
   private static readonly GOBLIN_EAR_HEIGHT = 16;
   private static readonly GOBLIN_EAR_OFFSET = 4;
   private static readonly GOBLIN_EAR_ANGLE = Math.PI / 2.5;

   public readonly inventory: Inventory;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeID: number | null, tribeType: TribeType, inventoryData: InventoryData) {
      super(position, hitboxes, id, secondsSinceLastHit, tribeID, tribeType);

      this.attachRenderParts([
         new RenderPart({
            width: Tribesman.RADIUS * 2,
            height: Tribesman.RADIUS * 2,
            textureSource: super.getTextureSource(tribeType),
            zIndex: 0
         }, this)
      ]);

      if (tribeType === TribeType.goblins) {
         // Goblin warpaint
         const warpaint = id % 3 + 1;
         this.attachRenderPart(
            new RenderPart({
               width: Tribesman.RADIUS * 2,
               height: Tribesman.RADIUS * 2,
               textureSource: `entities/human/goblin-warpaint-${warpaint}.png`,
               zIndex: 1
            }, this)
         );

         // Ears
         const leftEarOffset = new Vector(Tribesman.RADIUS + Tribesman.GOBLIN_EAR_OFFSET, -Tribesman.GOBLIN_EAR_ANGLE).convertToPoint();
         this.attachRenderPart(
            new RenderPart({
               width: Tribesman.GOBLIN_EAR_WIDTH,
               height: Tribesman.GOBLIN_EAR_HEIGHT,
               textureSource: "entities/human/goblin-ear-left.png",
               offset: () => leftEarOffset,
               getRotation: () => Math.PI/2 - Tribesman.GOBLIN_EAR_ANGLE,
               zIndex: 1
            }, this)
         );
         const rightEarOffset = new Vector(Tribesman.RADIUS + Tribesman.GOBLIN_EAR_OFFSET, Tribesman.GOBLIN_EAR_ANGLE).convertToPoint();
         this.attachRenderPart(
            new RenderPart({
               width: Tribesman.GOBLIN_EAR_WIDTH,
               height: Tribesman.GOBLIN_EAR_HEIGHT,
               textureSource: "entities/human/goblin-ear-right.png",
               offset: () => rightEarOffset,
               getRotation: () => -Math.PI/2 + Tribesman.GOBLIN_EAR_ANGLE,
               zIndex: 1
            }, this)
         );
      }

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
      const inventoryData = entityData.clientArgs[2];
      const itemSlots: ItemSlots = {};
      for (const [itemSlot, itemData] of Object.entries(inventoryData.itemSlots)) {
         const item = createItem(itemData.type, itemData.count, itemData.id);
         itemSlots[Number(itemSlot)] = item;
      }
      this.inventory.itemSlots = itemSlots;
   }
}

export default Tribesman;