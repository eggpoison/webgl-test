import { HitboxType, Point, TreeSize } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

const treeTextures: { [T in TreeSize]: string } = {
   [TreeSize.small]: "entities/tree/tree-small.png",
   [TreeSize.large]: "entities/tree/tree-large.png"
}

class Tree extends Entity {
   public readonly type = "tree";
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, treeSize: TreeSize) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: 80 + treeSize * 20,
            height: 80 + treeSize * 20,
            textureSource: treeTextures[treeSize],
            zIndex: 0
         }, this)
      ]);
   }
}

export default Tree;