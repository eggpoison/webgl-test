import { CowSpecies, Point } from "webgl-test-shared";
import { RenderPartInfo } from "../render-parts/RenderPart";
import Entity, { sortRenderParts } from "./Entity";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   private static readonly HEAD_IMAGE_WIDTH = 18 * 4;
   private static readonly HEAD_IMAGE_HEIGHT = 16 * 4;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_WIDTH = 64;
   private static readonly BODY_HEIGHT = 96;

   // private static readonly a = m;

   private static readonly RENDER_PARTS: { [key in CowSpecies]: ReadonlyArray<RenderPartInfo> } = (Object.values(CowSpecies).filter((_, i, arr) => i >= arr.length / 2) as ReadonlyArray<CowSpecies>).reduce((previousValue, currentValue) => {
      const num = currentValue === CowSpecies.brown ? 1 : 2;

      const newObject: Partial<{ [key in CowSpecies]: ReadonlyArray<RenderPartInfo> }> = Object.assign({}, previousValue);
      newObject[currentValue] = sortRenderParts([
         // Head
         {
            type: "image",
            width: Cow.HEAD_IMAGE_WIDTH,
            height: Cow.HEAD_IMAGE_HEIGHT,
            textureSrc: `cow/cow-head-${num}.png`,
            offset: new Point(0, (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2),
            zIndex: 2
         },
         // Body
         {
            type: "image",
            width: Cow.BODY_WIDTH,
            height: Cow.BODY_HEIGHT,
            textureSrc: `cow/cow-body-${num}.png`,
            offset: new Point(0, -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2),
            zIndex: 1
         }
      ]);
      return newObject;
   }, {}) as { [key in CowSpecies]: ReadonlyArray<RenderPartInfo>};

   constructor(position: Point, id: number, species: CowSpecies) {
      const renderParts = Cow.RENDER_PARTS[species];
      super(position, id, "cow", renderParts);
   }

   /*
   topmost position: (HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2
   bottom position: -(HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2

   head position = (HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2 - HEAD_SIZE / 2
                 = (BODY_HEIGHT - HEAD_OVERLAP) / 2
   */
}

export default Cow;