import { EntityData, HitboxType, Point, TribeType } from "webgl-test-shared";
import Entity from "./Entity";
import Hitbox from "../hitboxes/Hitbox";

abstract class TribeMember extends Entity {
   private readonly tribeType: TribeType;

   public tribeID: number | null;
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeID: number | null, tribeType: TribeType) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.tribeID = tribeID;
      this.tribeType = tribeType;
   }

   protected getTextureSource(tribeType: TribeType): string {
      switch (tribeType) {
         case TribeType.plainspeople: {
            return "entities/human/human1.png";
         }
         case TribeType.goblins: {
            return "entities/human/goblin.png";
         }
         case TribeType.frostlings: {
            return "entities/human/frostling.png"
         }
         case TribeType.barbarians: {
            return "entities/human/barbarian.png"
         }
      }
   }

   public updateFromData(entityData: EntityData<"player"> | EntityData<"tribesman">): void {
      super.updateFromData(entityData);

      this.tribeID = entityData.clientArgs[0];
   }
}

export default TribeMember;