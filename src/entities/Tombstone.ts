import { HitboxType, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Tombstone extends Entity {
   public readonly type = "tombstone";
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tombstoneType: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.addRenderParts([
         new RenderPart({
            width: 64,
            height: 96,
            textureSource: `tombstone${tombstoneType + 1}.png`
         })
      ]);
   }
}

export default Tombstone;