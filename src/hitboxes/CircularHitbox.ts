import { circleAndRectangleDoIntersect, circlesDoIntersect, HitboxType } from "webgl-test-shared";
import Hitbox, { HitboxBounds } from "./Hitbox";

class CircularHitbox extends Hitbox<"circular"> {
   public calculateHitboxBounds(): HitboxBounds {
      const minX = this.entity.position.x - this.info.radius;
      const maxX = this.entity.position.x + this.info.radius;
      const minY = this.entity.position.y - this.info.radius;
      const maxY = this.entity.position.y + this.info.radius;
      return [minX, maxX, minY, maxY];
   }

   public isColliding(otherHitbox: Hitbox<HitboxType>): boolean {
      switch (otherHitbox.info.type) {
         case "circular": {
            return circlesDoIntersect(this.position, this.info.radius, otherHitbox.position, otherHitbox.info.radius);
         }
         case "rectangular": {
            return circleAndRectangleDoIntersect(this.position, this.info.radius, otherHitbox.position, otherHitbox.info.width, otherHitbox.info.height, otherHitbox.entity.rotation);
         }
      }
   }
}

export default CircularHitbox;