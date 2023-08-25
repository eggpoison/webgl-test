import { BaseItemInfo, ItemType, Point, Vector, SETTINGS } from "webgl-test-shared";
import GameObject from "../GameObject";
import Game from "../Game";
import RenderPart from "../render-parts/RenderPart";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class DroppedItem extends GameObject implements BaseItemInfo {
   public readonly type: ItemType;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, velocity: Vector | null, itemType: ItemType) {
      super(position, hitboxes, id, true);
      
      this.velocity = velocity;
      this.type = itemType;

      Game.board.droppedItems[this.id] = this;

      const itemTextureSource = CLIENT_ITEM_INFO_RECORD[itemType].textureSource;

      this.attachRenderPart(
         new RenderPart({
            width: SETTINGS.ITEM_SIZE * 2,
            height: SETTINGS.ITEM_SIZE * 2,
            textureSource: "items/" + itemTextureSource,
            zIndex: 0
         }, this)
      );
   }

   public remove(): void {
      delete Game.board.droppedItems[this.id];
   }
}

export default DroppedItem;