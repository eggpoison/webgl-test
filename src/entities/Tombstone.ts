import { Point } from "webgl-test-shared";
import ImageRenderPart from "../render-parts/ImageRenderPart";
import RenderPart, { RenderPartInfo } from "../render-parts/RenderPart";
import Entity from "./Entity";

class Tombstone extends Entity {
   constructor(position: Point, id: number, secondsSinceLastHit: number | null, tombstoneType: number) {
      const renderParts: ReadonlyArray<RenderPart<RenderPartInfo>> = [
         new ImageRenderPart({
            type: "image",
            width: 64,
            height: 96,
            textureSrc: `tombstone${tombstoneType + 1}.png`
         })
      ];
      
      super(position, id, "tombstone", secondsSinceLastHit, renderParts);
   }
}

export default Tombstone;