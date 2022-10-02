import { CowSpecies, Point, Vector } from "webgl-test-shared";
import Entity, { RenderPart, sortRenderParts } from "./Entity";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   private static readonly HEAD_IMAGE_WIDTH = 18 * 4;
   private static readonly HEAD_IMAGE_HEIGHT = 16 * 4;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_WIDTH = 64;
   private static readonly BODY_HEIGHT = 96;

   // private static readonly a = m;

   private static readonly RENDER_PARTS: { [key in CowSpecies]: ReadonlyArray<RenderPart> } = (Object.values(CowSpecies).filter((_, i, arr) => i >= arr.length / 2) as ReadonlyArray<CowSpecies>).reduce((previousValue, currentValue) => {
      const num = currentValue === CowSpecies.brown ? 1 : 2;

      const newObject: Partial<{ [key in CowSpecies]: ReadonlyArray<RenderPart> }> = Object.assign({}, previousValue);
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
   }, {}) as { [key in CowSpecies]: ReadonlyArray<RenderPart>};

   protected readonly renderParts: ReadonlyArray<RenderPart>;

   constructor(id: number, position: Point, velocity: Vector | null, acceleration: Vector | null, terminalVelocity: number, rotation: number, species: CowSpecies) {
      super(id, "cow", position, velocity, acceleration, terminalVelocity, rotation);
      this.renderParts = Cow.RENDER_PARTS[species];
   }

   /*
   topmost position: (HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2
   bottom position: -(HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2

   head position = (HEAD_SIZE + BODY_HEIGHT - HEAD_OVERLAP) / 2 - HEAD_SIZE / 2
                 = (BODY_HEIGHT - HEAD_OVERLAP) / 2
   */
}

export default Cow;