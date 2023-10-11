import { circleAndRectangleDoIntersect, circlesDoIntersect, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import Hitbox from "./Hitbox";
import RectangularHitbox from "./RectangularHitbox";

class CircularHitbox extends Hitbox {
   public radius!: number;
   
   public updateHitboxBounds(offsetRotation: number): void {
      this.bounds[0] = this.position.x - this.radius;
      this.bounds[1] = this.position.x + this.radius;
      this.bounds[2] = this.position.y - this.radius;
      this.bounds[3] = this.position.y + this.radius;

      if (typeof this.offset !== "undefined") {
         let offsetX: number;
         let offsetY: number;
         if (offsetRotation !== 0) {
            offsetX = rotateXAroundPoint(this.offset.x, this.offset.y, 0, 0, offsetRotation);
            offsetY = rotateYAroundPoint(this.offset.x, this.offset.y, 0, 0, offsetRotation);
         } else {
            offsetX = this.offset.x;
            offsetY = this.offset.y;
         }

         this.bounds[0] += offsetX;
         this.bounds[1] += offsetX;
         this.bounds[2] += offsetY;
         this.bounds[3] += offsetY;
      }
   }

   public isColliding(otherHitbox: Hitbox): boolean {
      if (otherHitbox.hasOwnProperty("radius")) {
         // Circular hitbox
         return circlesDoIntersect(this.position, this.radius, otherHitbox.position, (otherHitbox as CircularHitbox).radius);
      } else {
         // Rectangular hitbox
         return circleAndRectangleDoIntersect(this.position, this.radius, otherHitbox.position, (otherHitbox as RectangularHitbox).width, (otherHitbox as RectangularHitbox).height, (otherHitbox as RectangularHitbox).rotation);
      }
   }
}

export default CircularHitbox;