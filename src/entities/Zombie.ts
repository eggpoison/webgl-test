import { HitboxType, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

const ZOMBIE_TEXTURE_SOURCES: { [zombieType: number]: string } = {
   0: "zombie1.png",
   1: "zombie2.png",
   2: "zombie3.png",
   3: "zombie-golden.png"
}

class Zombie extends Entity {
   public readonly type = "zombie";
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, zombieType: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.addRenderParts([
         new RenderPart({
            width: 64,
            height: 64,
            textureSource: "zombie/" + ZOMBIE_TEXTURE_SOURCES[zombieType]
         })
      ]);
   }
}

export default Zombie;