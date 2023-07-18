import { EntityType, Point, HitboxType, CactusFlowerType, Vector, CactusFlowerData } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Cactus extends Entity {
   private static readonly SIZE = 80;

   private static readonly FLOWER_TEXTURE_SOURCES: Record<CactusFlowerType, string> = {
      [CactusFlowerType.pinkGreen]: "cactus/cactus-flower1.png",
      [CactusFlowerType.pinkRed]: "cactus/cactus-flower2.png",
      [CactusFlowerType.white]: "cactus/cactus-flower3.png",
      [CactusFlowerType.pinkYellow]: "cactus/cactus-flower4.png",
      [CactusFlowerType.yellow]: "cactus/cactus-flower5.png"
   }

   public type: EntityType = "cactus";

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, flowers: ReadonlyArray<CactusFlowerData>) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderPart(
         new RenderPart({
            entity: this,
            width: Cactus.SIZE,
            height: Cactus.SIZE,
            textureSource: "cactus/cactus.png",
            zIndex: 0
         })
      );

      for (let i = 0; i < flowers.length; i++) {
         const { type, column, height, size } = flowers[i];
         
         const offsetDirection = column * Math.PI / 4;

         // Calculate position offset
         const offsetVector = new Vector(Cactus.SIZE / 2 * height, offsetDirection).convertToPoint();

         const textureSource = Cactus.FLOWER_TEXTURE_SOURCES[type];
         this.attachRenderPart(
            new RenderPart({
               entity: this,
               width: size,
               height: size,
               textureSource: textureSource,
               zIndex: 1,
               offset: () => offsetVector
            })
         );
      }
   }
}

export default Cactus;