import { HitboxInfo, HitboxType, Point } from "webgl-test-shared";
import Entity from "../entities/Entity";

export type HitboxBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class Hitbox<T extends HitboxType> {
   public info: HitboxInfo<T>;
   public entity!: Entity;

   /** The bounds of the hitbox since the last physics update */
   public bounds!: HitboxBounds;

   public position!: Point;

   constructor(hitboxInfo: HitboxInfo<T>) {
      this.info = hitboxInfo;
   }

   public setEntity(entity: Entity): void {
      this.entity = entity;
   }

   protected abstract calculateHitboxBounds(): HitboxBounds;

   public updateHitboxBounds(): void {
      this.bounds = this.calculateHitboxBounds();
   }

   public updatePosition(): void {
      this.position = this.entity.position.copy();
      if (typeof this.info.offset !== "undefined") {
         this.position.add(this.info.offset);
      }
   }

   public abstract isColliding(otherHitbox: Hitbox<HitboxType>): boolean;
}

export default Hitbox;