import { EntityData, InventoryData, ItemType, Point, TribeType } from "webgl-test-shared";
import TribeMember from "./TribeMember";
import RenderPart from "../render-parts/RenderPart";
import { Inventory, ItemSlots } from "../items/Item";
import { createItem } from "../items/item-creation";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createFootprintParticle } from "../generic-particles";
import Board from "../Board";

class Tribesman extends TribeMember {
   public readonly type = "tribesman";

   private static readonly RADIUS = 32;

   private static readonly GOBLIN_EAR_WIDTH = 20;
   private static readonly GOBLIN_EAR_HEIGHT = 16;
   private static readonly GOBLIN_EAR_OFFSET = 4;
   private static readonly GOBLIN_EAR_ANGLE = Math.PI / 2.5;

   public readonly inventory: Inventory;

   private numFootstepsTaken = 0;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, tribeID: number | null, tribeType: TribeType, armour: ItemType | null, activeItem: ItemType | null, foodEatingType: ItemType | -1, lastAttackTicks: number, lastEatTicks: number, inventoryData: InventoryData) {
      super(position, hitboxes, id, tribeID, tribeType, armour, activeItem, foodEatingType, lastAttackTicks, lastEatTicks);

      this.attachRenderPart(
         new RenderPart(
            Tribesman.RADIUS * 2,
            Tribesman.RADIUS * 2,
            super.getTextureSource(tribeType),
            1,
            0
         )
      );

      if (tribeType === TribeType.goblins) {
         // Goblin warpaint
         const warpaint = id % 3 + 1;
         this.attachRenderPart(
            new RenderPart(
               Tribesman.RADIUS * 2,
               Tribesman.RADIUS * 2,
               `entities/human/goblin-warpaint-${warpaint}.png`,
               2,
               0
            )
         );

         // Left ear
         const leftEarRenderPart = new RenderPart(
            Tribesman.GOBLIN_EAR_WIDTH,
            Tribesman.GOBLIN_EAR_HEIGHT,
            "entities/human/goblin-ear.png",
            2,
            Math.PI/2 - Tribesman.GOBLIN_EAR_ANGLE,
         );
         leftEarRenderPart.offset = Point.fromVectorForm(Tribesman.RADIUS + Tribesman.GOBLIN_EAR_OFFSET, -Tribesman.GOBLIN_EAR_ANGLE);
         leftEarRenderPart.flipX = true;

         // Right ear
         const rightEarRenderPart = new RenderPart(
            Tribesman.GOBLIN_EAR_WIDTH,
            Tribesman.GOBLIN_EAR_HEIGHT,
            "entities/human/goblin-ear.png",
            2,
            -Math.PI/2 + Tribesman.GOBLIN_EAR_ANGLE,
         );
         rightEarRenderPart.offset = Point.fromVectorForm(Tribesman.RADIUS + Tribesman.GOBLIN_EAR_OFFSET, Tribesman.GOBLIN_EAR_ANGLE);
         this.attachRenderPart(rightEarRenderPart);
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
         inventoryName: "hotbar"
      };

      return inventory;
   }

   public tick(): void {
      super.tick();

      // Footsteps
      if (this.velocity !== null && !this.isInRiver() && Board.tickIntervalHasPassed(0.15)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 4);
         this.numFootstepsTaken++;
      }
   }

   public updateFromData(entityData: EntityData<"tribesman">): void {
      super.updateFromData(entityData);

      // Update inventory from data
      const inventoryData = entityData.clientArgs[7];
      const itemSlots: ItemSlots = {};
      for (const [itemSlot, itemData] of Object.entries(inventoryData.itemSlots)) {
         const item = createItem(itemData.type, itemData.count, itemData.id);
         itemSlots[Number(itemSlot)] = item;
      }
      this.inventory.itemSlots = itemSlots;
   }
}

export default Tribesman;