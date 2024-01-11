import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import CircularHitbox from "./CircularHitbox";
import RectangularHitbox from "./RectangularHitbox";
import GameObject from "../GameObject";

export type HitboxBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class Hitbox {
   public readonly mass: number;
   public readonly localID: number;
   
   /** The position of the hitbox, accounting for its offset and offset rotation */
   public position = new Point(0, 0);

   public offset = new Point(0, 0);

   /** The bounds of the hitbox since the last physics update */
   public bounds: HitboxBounds = [-1, -1, -1, -1];

   constructor(mass: number, localID: number) {
      this.mass = mass;
      this.localID = localID;
   }

   public abstract updateHitboxBounds(offsetRotation: number): void;

   public updateFromGameObject(gameObject: GameObject): void {
      this.position.x = gameObject.position.x;
      this.position.y = gameObject.position.y;

      this.position.x += rotateXAroundPoint(this.offset.x, this.offset.y, 0, 0, gameObject.rotation);
      this.position.y += rotateYAroundPoint(this.offset.x, this.offset.y, 0, 0, gameObject.rotation);
   }

   public abstract isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean;
}

export default Hitbox;