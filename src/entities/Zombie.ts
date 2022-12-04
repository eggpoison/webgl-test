import { Point } from "webgl-test-shared";
import ImageRenderPart from "../render-parts/ImageRenderPart";
import RenderPart, { RenderPartInfo } from "../render-parts/RenderPart";
import Entity from "./Entity";

const ZOMBIE_TEXTURE_SOURCES: { [zombieType: number]: string } = {
   0: "zombie1.png",
   1: "zombie2.png",
   2: "zombie3.png"
}

class Zombie extends Entity {
   constructor(position: Point, id: number, secondsSinceLastHit: number | null, zombieType: number) {
      const renderParts: ReadonlyArray<RenderPart<RenderPartInfo>> = [
         new ImageRenderPart({
            type: "image",
            width: 64,
            height: 64,
            textureSrc: "zombie/" + ZOMBIE_TEXTURE_SOURCES[zombieType]
         })
      ];
      
      super(position, id, "zombie", secondsSinceLastHit, renderParts);
   }
}

export default Zombie;