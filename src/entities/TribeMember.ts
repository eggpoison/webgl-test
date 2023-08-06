import { HitboxType, Point, TribeType } from "webgl-test-shared";
import Entity from "./Entity";
import Hitbox from "../hitboxes/Hitbox";

abstract class TribeMember extends Entity {
   private readonly tribeType: TribeType;
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeType: TribeType) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.tribeType = tribeType;
   }
}

export default TribeMember;