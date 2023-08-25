import { Point } from "webgl-test-shared";
import GameObject from "../GameObject";
import CircularHitbox from "./CircularHitbox";
import RectangularHitbox from "./RectangularHitbox";

export type HitboxBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class Hitbox {
   public gameObject!: GameObject;

   /** The bounds of the hitbox since the last physics update */
   public bounds!: HitboxBounds;

   public position!: Point;

   public offset?: Point;

   constructor(offset?: Point) {
      this.offset = offset;
   }

   public setObject(gameObject: GameObject): void {
      this.gameObject = gameObject;
   }

   protected abstract calculateHitboxBounds(): HitboxBounds;

   public updateHitboxBounds(): void {
      this.bounds = this.calculateHitboxBounds();
   }

   public updatePosition(): void {
      this.position = this.gameObject.position.copy();
      if (typeof this.offset !== "undefined") {
         this.position.add(this.offset);
      }
   }

   public abstract isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean;
}

export default Hitbox;