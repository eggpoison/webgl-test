import { Point } from "webgl-test-shared";
import GameObject from "../GameObject";
import Game from "../Game";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Projectile extends GameObject {
   public lastX = 0;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super(position, hitboxes, id);

      Game.board.projectiles[this.id] = this;
   }

   public remove(): void {
      delete Game.board.projectiles[this.id];
   }
}

export default Projectile;