import { HitboxCollisionType, Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import CircularHitbox from "./CircularHitbox";
import RectangularHitbox from "./RectangularHitbox";
import Entity from "../Entity";

export type HitboxBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class Hitbox {
   public readonly mass: number;
   public collisionType: HitboxCollisionType;
   
   /** The position of the hitbox, accounting for its offset and offset rotation */
   public position = new Point(0, 0);

   public offset = new Point(0, 0);

   /** The bounds of the hitbox since the last physics update */
   public bounds: HitboxBounds = [-1, -1, -1, -1];

   constructor(mass: number, collisionType: HitboxCollisionType) {
      this.mass = mass;
      this.collisionType = collisionType;
   }

   public abstract updateHitboxBounds(offsetRotation: number): void;

   public updateFromEntity(entity: Entity): void {
      this.position.x = entity.position.x;
      this.position.y = entity.position.y;

      this.position.x += rotateXAroundPoint(this.offset.x, this.offset.y, 0, 0, entity.rotation);
      this.position.y += rotateYAroundPoint(this.offset.x, this.offset.y, 0, 0, entity.rotation);
   }

   public abstract isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean;
}

export default Hitbox;