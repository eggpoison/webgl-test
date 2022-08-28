import { Point } from "webgl-test-shared";
import Entity, { RenderPart, sortRenderParts } from "./Entity";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 32;
   private static readonly BODY_WIDTH = 64;
   private static readonly BODY_HEIGHT = 96;

   private static readonly RENDER_PARTS: ReadonlyArray<RenderPart> = sortRenderParts([
      // Head
      {
         type: "image",
         width: Cow.HEAD_SIZE,
         height: Cow.HEAD_SIZE,
         textureSrc: "cow-head.png",
         offset: new Point(0, (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2),
         zIndex: 2
      },
      // Body
      {
         type: "image",
         width: Cow.BODY_WIDTH,
         height: Cow.BODY_HEIGHT,
         textureSrc: "cow-body.png",
         offset: new Point(0, -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2),
         zIndex: 1
      }
   ]);

   /*
   topmost position: (HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2 = 64
   bottom position: -(HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2 = -64

   head position = (HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2 - HEAD_SIZE / 2
                 = (BODY_HEIGHT - HEAD_OVERLAP) / 2 = 32
   */

   protected readonly renderParts: ReadonlyArray<RenderPart> = Cow.RENDER_PARTS;
}

export default Cow;