import { FishColour, Point, randItem } from "webgl-test-shared";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class Fish extends Entity {
   private static readonly WIDTH = 7 * 4;
   private static readonly HEIGHT = 14 * 4;
   
   public readonly type = "fish";

   private static readonly TEXTURE_SOURCES: ReadonlyArray<string> = [
      "entities/fish/fish-blue.png",
      "entities/fish/fish-gold.png",
      "entities/fish/fish-red.png",
      "entities/fish/fish-lime.png"
   ];
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, colour: FishColour) {
      super(position, hitboxes, id, renderDepth);

      const textureSource = randItem(Fish.TEXTURE_SOURCES);
      this.attachRenderPart(
         new RenderPart(
            this,
            Fish.WIDTH, Fish.HEIGHT,
            getGameObjectTextureArrayIndex(textureSource),
            0,
            0
         )
      );
   }
}

export default Fish;