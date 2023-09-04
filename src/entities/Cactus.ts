import { EntityType, Point, Vector, CactusFlowerSize, CactusBodyFlowerData, CactusLimbData, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import TexturedParticle from "../particles/TexturedParticle";
import { ParticleRenderLayer } from "../particles/Particle";
import Board from "../Board";

class Cactus extends Entity {
   private static readonly RADIUS = 40;

   private static readonly LIMB_SIZE = 36;

   public type: EntityType = "cactus";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, flowers: ReadonlyArray<CactusBodyFlowerData>, limbs: ReadonlyArray<CactusLimbData>) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart({
            width: Cactus.RADIUS * 2,
            height: Cactus.RADIUS * 2,
            textureSource: "entities/cactus/cactus.png",
            zIndex: 2
         })
      );

      // Attach flower render parts
      for (let i = 0; i < flowers.length; i++) {
         const { type, size, column, height, rotation } = flowers[i];
         
         // Calculate position offset
         const offsetDirection = column * Math.PI / 4;
         const offsetVector = Point.fromVectorForm(height, offsetDirection);

         const flowerSize = (type === 4 || size === CactusFlowerSize.large) ? 20 : 16;

         this.attachRenderPart(
            new RenderPart({
               width: flowerSize,
               height: flowerSize,
               textureSource: this.getFlowerTextureSource(type, size),
               zIndex: 3,
               offset: () => offsetVector,
               getRotation: () => rotation
            })
         );
      }

      // Limbs
      for (let i = 0; i < limbs.length; i++) {
         const { direction, flower } = limbs[i];

         const offset = new Vector(Cactus.RADIUS, direction).convertToPoint();

         const limbRotation = 2 * Math.PI * Math.random();
         this.attachRenderPart(
            new RenderPart({
               width: Cactus.LIMB_SIZE,
               height: Cactus.LIMB_SIZE,
               textureSource: "entities/cactus/cactus-limb.png",
               zIndex: 0,
               offset: () => offset,
               getRotation: () => limbRotation
            })
         );
         
         if (typeof flower !== "undefined") {
            const { type, height, direction, rotation } = flower;

            const flowerOffset = new Vector(height, direction).convertToPoint();
            flowerOffset.add(offset);

            this.attachRenderPart(
               new RenderPart({
                  width: 16,
                  height: 16,
                  textureSource: this.getFlowerTextureSource(type, CactusFlowerSize.small),
                  zIndex: 1,
                  offset: () => flowerOffset,
                  getRotation: () => rotation
               })
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

   protected onHit(): void {
      // Create cactus spine particles when hurt
      const numSpines = randInt(3, 5);
      for (let i = 0; i < numSpines; i++) {
         this.createCactusSpineParticle(2 * Math.PI * Math.random());
      }
   }

   private createCactusSpineParticle(flyDirection: number): void {
      const spawnPosition = this.position.copy();
      const offset = new Vector(Cactus.RADIUS - 5, flyDirection).convertToPoint();
      spawnPosition.add(offset);
      
      const lifetime = randFloat(0.2, 0.3);

      const particle = new TexturedParticle(
         null,
         4,
         16,
         spawnPosition,
         new Vector(randFloat(150, 200), flyDirection),
         null,
         lifetime,
         "particles/cactus-spine.png"
      );
      particle.rotation = flyDirection;
      particle.getOpacity = (age: number) => {
         return 1 - age / lifetime;
      };
      Board.addTexturedParticle(particle, ParticleRenderLayer.high)
   }
}

export default Cactus;