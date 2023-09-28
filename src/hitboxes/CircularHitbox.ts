import { Point, circleAndRectangleDoIntersect, circlesDoIntersect } from "webgl-test-shared";
import Hitbox, { HitboxBounds } from "./Hitbox";
import RectangularHitbox from "./RectangularHitbox";

class CircularHitbox extends Hitbox {
   public radius: number;
   
   constructor(radius: number, offset?: Point) {
      super(offset);

      this.radius = radius;
   }
   
   public calculateHitboxBounds(): HitboxBounds {
      let minX = this.gameObject.position.x - this.radius;
      let maxX = this.gameObject.position.x + this.radius;
      let minY = this.gameObject.position.y - this.radius;
      let maxY = this.gameObject.position.y + this.radius;

      if (typeof this.offset !== "undefined") {
         minX += this.offset.x;
         maxX += this.offset.x;
         minY += this.offset.y;
         maxY += this.offset.y;
      }
      
      return [minX, maxX, minY, maxY];
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