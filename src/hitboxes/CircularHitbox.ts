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
      const minX = this.gameObject.position.x - this.radius;
      const maxX = this.gameObject.position.x + this.radius;
      const minY = this.gameObject.position.y - this.radius;
      const maxY = this.gameObject.position.y + this.radius;
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