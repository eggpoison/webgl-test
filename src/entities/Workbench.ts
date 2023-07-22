import { HitboxType, Point } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Workbench extends Entity {
   public readonly type = "workbench";
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: 80,
            height: 80,
            textureSource: "entities/workbench/workbench.png",
            zIndex: 0
         }, this)
      ]);
   }
}

export default Workbench;