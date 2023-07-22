import { EntityData, EntityType, Point, HitboxType, ServerEntitySpecialData, StatusEffectType } from "webgl-test-shared";
import Game from "../Game";
import Hitbox from "../hitboxes/Hitbox";
import GameObject from "../GameObject";

abstract class Entity extends GameObject {
   public abstract readonly type: EntityType;

   public secondsSinceLastHit: number | null;

   public special?: ServerEntitySpecialData;

   public statusEffects = new Array<StatusEffectType>();

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id);
      
      this.secondsSinceLastHit = secondsSinceLastHit;

      // Add entity to the ID record
      Game.board.entities[this.id] = this;
   }

   public remove(): void {
      delete Game.board.entities[this.id];
   }

   public updateFromData(entityData: EntityData<EntityType>): void {
      super.updateFromData(entityData);

      this.secondsSinceLastHit = entityData.secondsSinceLastHit;
      this.statusEffects = entityData.statusEffects;
      this.special = entityData.special;
   }
}

export default Entity;