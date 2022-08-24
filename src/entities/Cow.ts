import Entity, { RenderPart } from "./Entity";

class Cow extends Entity {
   protected readonly renderParts: ReadonlyArray<RenderPart> = [
      {
         type: "circle",
         rgba: [0, 255, 0, 1],
         radius: 48
      }
   ];
}

export default Cow;