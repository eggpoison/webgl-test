import { BaseItemInfo, ItemType, Point, Vector, HitboxType } from "webgl-test-shared";
import GameObject from "../GameObject";
import Hitbox from "../hitboxes/Hitbox";
import Game from "../Game";

class DroppedItem extends GameObject implements BaseItemInfo {
   // public readonly id: number;

   // public position: Point;
   // public velocity: Vector | null = null;

   // /** Chunks which contain the item entity */
   // public chunks: Set<Chunk>;

   // public readonly rotation: number;

   public readonly type: ItemType;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, velocity: Vector | null, itemType: ItemType) {
      super(position, hitboxes, id, true);
      
      // this.id = id;
      // this.position = position;
      this.velocity = velocity;
      this.type = itemType;

      // this.rotation = rotation;

      // Add to containing chunks
      // this.chunks = containingChunks;

      Game.board.droppedItems[this.id] = this;
   }

   public remove(): void {
      delete Game.board.droppedItems[this.id];
   }
}

export default DroppedItem;