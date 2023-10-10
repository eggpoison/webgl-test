import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import CircularHitbox from "./CircularHitbox";
import RectangularHitbox from "./RectangularHitbox";
import GameObject from "../GameObject";

export type HitboxBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class Hitbox {
   public position = new Point(0, 0);

   public offset?: Point;

   /** The bounds of the hitbox since the last physics update */
   public bounds: HitboxBounds = [-1, -1, -1, -1];

   constructor(offset?: Point) {
      this.offset = offset;
   }

   public abstract updateHitboxBounds(): void;

   public updatePositionFromGameObject(gameObject: GameObject): void {
      this.position.x = gameObject.position.x;
      this.position.y = gameObject.position.y;

      if (typeof this.offset !== "undefined") {
         this.position.x += rotateXAroundPoint(this.offset.x, this.offset.y, 0, 0, gameObject.rotation);
         this.position.y += rotateYAroundPoint(this.offset.x, this.offset.y, 0, 0, gameObject.rotation);
      }
   }

   public abstract isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean;
}

export default Hitbox;