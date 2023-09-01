import { DeathInfo, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class Tombstone extends Entity {
   public readonly type = "tombstone";
   
   public readonly deathInfo: DeathInfo | null;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null, tombstoneType: number, deathInfo: DeathInfo | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: 64,
            height: 96,
            textureSource: `entities/tombstone/tombstone${tombstoneType + 1}.png`,
            zIndex: 0
         })
      ]);

      this.deathInfo = deathInfo;
   }
}

export default Tombstone;