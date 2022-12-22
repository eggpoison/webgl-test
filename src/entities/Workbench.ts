import { HitboxType, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Workbench extends Entity {
   public readonly type = "workbench";
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.addRenderParts([
         new RenderPart({
            width: 50,
            height: 50,
            textureSource: "workbench.png"
         })
      ]);
   }
}

export default Workbench;