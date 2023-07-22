import { HitboxType, Point } from "webgl-test-shared";
import GameObject from "../GameObject";
import Hitbox from "../hitboxes/Hitbox";
import Game from "../Game";

class Projectile extends GameObject {
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number) {
      super(position, hitboxes, id);

      Game.board.projectiles[this.id] = this;
   }

   public remove(): void {
      delete Game.board.projectiles[this.id];
   }
}

export default Projectile;