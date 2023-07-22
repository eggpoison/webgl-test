import { HitboxType, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

const TOMBSTONE_DEATH_MESSAGES: ReadonlyArray<string> = [
   "__NAME__ forgot their glasses when driving near a cliff.",
   "__NAME__ tried to hug a yeti."
];

const NAMES: ReadonlyArray<string> = [
   "James Wilson"
];

class Tombstone extends Entity {
   public readonly type = "tombstone";
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tombstoneType: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: 64,
            height: 96,
            textureSource: `tombstone/tombstone${tombstoneType + 1}.png`,
            zIndex: 0
         }, this)
      ]);
   }
}

export default Tombstone;