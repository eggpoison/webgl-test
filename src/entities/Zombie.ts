import { Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

const ZOMBIE_TEXTURE_SOURCES: { [zombieType: number]: string } = {
   0: "zombie1.png",
   1: "zombie2.png",
   2: "zombie3.png",
   3: "zombie-golden.png"
}

class Zombie extends Entity {
   public readonly type = "zombie";
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null, zombieType: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: 64,
            height: 64,
            textureSource: "entities/zombie/" + ZOMBIE_TEXTURE_SOURCES[zombieType],
            zIndex: 0
         }, this)
      ]);
   }
}

export default Zombie;