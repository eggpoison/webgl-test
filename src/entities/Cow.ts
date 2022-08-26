import { Point } from "webgl-test-shared";
import Entity, { RenderPart, sortRenderParts } from "./Entity";

class Cow extends Entity {
   private static readonly RENDER_PARTS: ReadonlyArray<RenderPart> = sortRenderParts([
      {
         type: "circle",
         rgba: [0, 255, 0, 1],
         radius: 48,
         zIndex: 0
      },
      {
         type: "image",
         width: 64,
         height: 64,
         textureSrc: "cow-head.png",
         offset: new Point(0, 32),
         zIndex: 2
      },
      {
         type: "image",
         width: 64,
         height: 64,
         textureSrc: "cow-body.png",
         zIndex: 1
      }
   ]);

   protected readonly renderParts: ReadonlyArray<RenderPart> = Cow.RENDER_PARTS;
}

export default Cow;