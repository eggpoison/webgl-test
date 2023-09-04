import { BaseItemInfo, ItemType, Point, Vector, SETTINGS } from "webgl-test-shared";
import GameObject from "../GameObject";
import RenderPart from "../render-parts/RenderPart";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class DroppedItem extends GameObject implements BaseItemInfo {
   public readonly itemType: ItemType;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, velocity: Vector | null, itemType: ItemType) {
      super(position, hitboxes, id);
      
      this.velocity = velocity;
      this.itemType = itemType;

      this.attachRenderPart(
         new RenderPart({
            width: SETTINGS.ITEM_SIZE * 2,
            height: SETTINGS.ITEM_SIZE * 2,
            textureSource: CLIENT_ITEM_INFO_RECORD[itemType].textureSource,
            zIndex: 0
         })
      );
   }
}

export default DroppedItem;