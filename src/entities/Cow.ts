import { CowSpecies, Point } from "webgl-test-shared";
import ImageRenderPart from "../render-parts/ImageRenderPart";
import RenderPart, { RenderPartInfo } from "../render-parts/RenderPart";
import Entity from "./Entity";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   private static readonly HEAD_IMAGE_WIDTH = 18 * 4;
   private static readonly HEAD_IMAGE_HEIGHT = 16 * 4;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_WIDTH = 64;
   private static readonly BODY_HEIGHT = 96;

   constructor(position: Point, id: number, secondsSinceLastHit: number | null, species: CowSpecies) {
      const cowNum = species === CowSpecies.brown ? 1 : 2;
      
      const renderParts: ReadonlyArray<RenderPart<RenderPartInfo>> = [
         // Body
         new ImageRenderPart({
            type: "image",
            width: Cow.BODY_WIDTH,
            height: Cow.BODY_HEIGHT,
            textureSrc: `cow/cow-body-${cowNum}.png`,
            offset: new Point(0, -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2)
         }),
         // Head
         new ImageRenderPart({
            type: "image",
            width: Cow.HEAD_IMAGE_WIDTH,
            height: Cow.HEAD_IMAGE_HEIGHT,
            textureSrc: `cow/cow-head-${cowNum}.png`,
            offset: new Point(0, (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2)
         })
      ];
      
      super(position, id, "cow", secondsSinceLastHit, renderParts);
   }

   /*
   topmost position: (HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2
   bottom position: -(HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2

   head position = (HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2 - HEAD_SIZE / 2
                 = (BODY_HEIGHT - HEAD_OVERLAP) / 2
   */
}

export default Cow;