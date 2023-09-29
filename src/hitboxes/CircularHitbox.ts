import { Point, circleAndRectangleDoIntersect, circlesDoIntersect } from "webgl-test-shared";
import Hitbox from "./Hitbox";
import RectangularHitbox from "./RectangularHitbox";

class CircularHitbox extends Hitbox {
   public radius: number;
   
   constructor(radius: number, offset?: Point) {
      super(offset);

      this.radius = radius;
   }
   
   public updateHitboxBounds(): void {
      this.bounds[0] = this.gameObject.position.x - this.radius;
      this.bounds[1] = this.gameObject.position.x + this.radius;
      this.bounds[2] = this.gameObject.position.y - this.radius;
      this.bounds[3] = this.gameObject.position.y + this.radius;

      if (typeof this.offset !== "undefined") {
         this.bounds[0] += this.offset.x;
         this.bounds[1] += this.offset.x;
         this.bounds[2] += this.offset.y;
         this.bounds[3] += this.offset.y;
      }
   }

   public isColliding(otherHitbox: Hitbox): boolean {
      if (otherHitbox.hasOwnProperty("radius")) {
         // Circular hitbox
         return circlesDoIntersect(this.position, this.radius, otherHitbox.position, (otherHitbox as CircularHitbox).radius);
      } else {
         // Rectangular hitbox
         return circleAndRectangleDoIntersect(this.position, this.radius, otherHitbox.position, (otherHitbox as RectangularHitbox).width, (otherHitbox as RectangularHitbox).height, otherHitbox.gameObject.rotation);
      }
   }
}

export default CircularHitbox;