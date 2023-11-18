import { Point } from "webgl-test-shared";
import GameObject from "../GameObject";

class Projectile extends GameObject {
   protected readonly data: any;
   
   constructor(position: Point, id: number, renderDepth: number, data: any) {
      super(position, id, renderDepth);

      this.data = data;
   }
}

export default Projectile;