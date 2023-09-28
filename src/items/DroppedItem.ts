import { BaseItemInfo, ItemType, Point, Vector, SETTINGS, randFloat } from "webgl-test-shared";
import GameObject from "../GameObject";
import RenderPart from "../render-parts/RenderPart";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Board from "../Board";
import { BloodParticleSize, createBloodParticle } from "../generic-particles";

class DroppedItem extends GameObject implements BaseItemInfo {
   public readonly itemType: ItemType;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, velocity: Vector | null, itemType: ItemType) {
      super(position, hitboxes, id);
      
      this.velocity = velocity;
      this.itemType = itemType;

      this.attachRenderPart(
         new RenderPart(
            SETTINGS.ITEM_SIZE * 2,
            SETTINGS.ITEM_SIZE * 2,
            CLIENT_ITEM_INFO_RECORD[itemType].textureSource,
            0,
            0
         )
      );
   }

   public tick(): void {
      super.tick();

      // Make the deep frost heart item spew blood particles
      if (this.itemType === ItemType.deep_frost_heart && Board.tickIntervalHasPassed(0.4)) {
         for (let i = 0; i < 6; i++) {
            const spawnPositionOffsetMagnitude = 13;
            const spawnPositionOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = this.position.x + spawnPositionOffsetMagnitude * Math.sin(spawnPositionOffsetDirection);
            const spawnPositionY = this.position.y + spawnPositionOffsetMagnitude * Math.cos(spawnPositionOffsetDirection);
            createBloodParticle(BloodParticleSize.small, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(40, 60), true);
         }
      }
   }
}

export default DroppedItem;