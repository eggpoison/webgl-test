import { circleAndRectangleDoIntersect, circlesDoIntersect } from "webgl-test-shared";
import Hitbox from "./Hitbox";
import RectangularHitbox from "./RectangularHitbox";

class CircularHitbox extends Hitbox {
   public radius: number;

   constructor(mass: number, radius: number, localID: number) {
      super(mass, localID);
      
      this.radius = radius;
   }
   
   public updateHitboxBounds(): void {
      this.bounds[0] = this.position.x - this.radius;
      this.bounds[1] = this.position.x + this.radius;
      this.bounds[2] = this.position.y - this.radius;
      this.bounds[3] = this.position.y + this.radius;
   }

   public isColliding(otherHitbox: Hitbox): boolean {
      if (otherHitbox.hasOwnProperty("radius")) {
         // Circular hitbox
         return circlesDoIntersect(this.position.x, this.position.y, this.radius, otherHitbox.position.x, otherHitbox.position.y, (otherHitbox as CircularHitbox).radius);
      } else {
         // Rectangular hitbox
         return circleAndRectangleDoIntersect(this.position.x, this.position.y, this.radius, otherHitbox.position.x, otherHitbox.position.y, (otherHitbox as RectangularHitbox).width, (otherHitbox as RectangularHitbox).height, (otherHitbox as RectangularHitbox).rotation + (otherHitbox as RectangularHitbox).externalRotation);
      }
   }
}

export default CircularHitbox;