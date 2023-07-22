import { EntityType, Point, HitboxType, Vector, CactusFlowerSize, CactusBodyFlowerData, CactusLimbData, randFloat, lerp } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Cactus extends Entity {
   private static readonly SIZE = 80;

   private static readonly LIMB_SIZE = 36;

   private static readonly LIMB_PADDING = 10;

   public type: EntityType = "cactus";

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, flowers: ReadonlyArray<CactusBodyFlowerData>, limbs: ReadonlyArray<CactusLimbData>) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderPart(
         new RenderPart({
            width: Cactus.SIZE,
            height: Cactus.SIZE,
            textureSource: "entities/cactus/cactus.png",
            zIndex: 2
         }, this)
      );

      // Attach flower render parts
      for (let i = 0; i < flowers.length; i++) {
         const { type, size, column, height } = flowers[i];
         
         // Calculate position offset
         const offsetDirection = column * Math.PI / 4;
         const offsetVector = new Vector(lerp(10, Cactus.SIZE / 2 - Cactus.LIMB_PADDING, height), offsetDirection).convertToPoint();

         let flowerSize = (type === 4 || size === CactusFlowerSize.large) ? 20 : 16;

         this.attachRenderPart(
            new RenderPart({
               width: flowerSize,
               height: flowerSize,
               textureSource: this.getFlowerTextureSource(type, size),
               zIndex: 3,
               offset: () => offsetVector,
               rotation: 2 * Math.PI * Math.random()
            }, this)
         );
      }

      // Limbs
      for (let i = 0; i < limbs.length; i++) {
         const { direction, flower } = limbs[i];

         const offset = new Vector(Cactus.SIZE / 2, direction).convertToPoint();

         this.attachRenderPart(
            new RenderPart({
               width: Cactus.LIMB_SIZE,
               height: Cactus.LIMB_SIZE,
               textureSource: "entities/cactus/cactus-limb.png",
               zIndex: 0,
               offset: () => offset,
               rotation: 2 * Math.PI * Math.random()
            }, this)
         );
         
         if (typeof flower !== "undefined") {
            const { type, height, direction } = flower;

            const flowerOffset = new Vector(randFloat(6, 10) * height, direction).convertToPoint();
            flowerOffset.add(offset);

            this.attachRenderPart(
               new RenderPart({
                  width: 16,
                  height: 16,
                  textureSource: this.getFlowerTextureSource(type, CactusFlowerSize.small),
                  zIndex: 1,
                  offset: () => flowerOffset,
                  rotation: 2 * Math.PI * Math.random()
               }, this)
            );
         }
      }
   }

   private getFlowerTextureSource(type: number, size: CactusFlowerSize): string {
      if (type === 4) {
         return "entities/cactus/cactus-flower-5.png";
      } else {
         return `entities/cactus/cactus-flower-${size === CactusFlowerSize.small ? "small" : "large"}-${type + 1}.png`;
      }
   }
}

export default Cactus;