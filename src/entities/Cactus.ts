import { EntityType, Point, HitboxType, Vector, CactusFlowerData, CactusFlowerSize } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Cactus extends Entity {
   private static readonly SIZE = 80;

   private static readonly FLOWER_SIZES: Record<number, number> = {
      0: 16,
      1: 20,
      2: 20,
      3: 16
   };

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

      // Attach flower render parts
      for (let i = 0; i < flowers.length; i++) {
         const { type, column, height, size } = flowers[i];
         
         // Calculate position offset
         const offsetDirection = column * Math.PI / 4;
         const offsetVector = new Vector(Cactus.SIZE / 2 * height, offsetDirection).convertToPoint();

         const flowerSize = size === CactusFlowerSize.small ? 16 : 20;

         this.attachRenderPart(
            new RenderPart({
               entity: this,
               width: flowerSize,
               height: flowerSize,
               textureSource: `cactus/cactus-flower-${size === CactusFlowerSize.small ? "small" : "large"}-${type + 1}.png`,
               zIndex: 1,
               offset: () => offsetVector
            })
         );
      }
   }
}

export default Cactus;