import { Point } from "webgl-test-shared";
import GameObject from "../GameObject";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Projectile extends GameObject {
   protected readonly data: number;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, data: number) {
      super(position, hitboxes, id, renderDepth);

      this.data = data;
   }
}

export default Projectile;