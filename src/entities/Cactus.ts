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
         new RenderPart(
            Cactus.RADIUS * 2,
            Cactus.RADIUS * 2,
            "entities/cactus/cactus.png",
            2,
            0
         )
      );

      // Attach flower render parts
      for (let i = 0; i < flowers.length; i++) {
         const flowerInfo = flowers[i];
         
         // Calculate position offset
         const offsetDirection = flowerInfo.column * Math.PI / 4;
         const offsetVector = Point.fromVectorForm(flowerInfo.height, offsetDirection);

         const flowerSize = (flowerInfo.type === 4 || flowerInfo.size === CactusFlowerSize.large) ? 20 : 16;

         const renderPart = new RenderPart(
            flowerSize,
            flowerSize,
            this.getFlowerTextureSource(flowerInfo.type, flowerInfo.size),
            3,
            flowerInfo.rotation
         );
         renderPart.offset = offsetVector;
         this.attachRenderPart(renderPart);
      }

      // Limbs
      for (let i = 0; i < limbs.length; i++) {
         const limbInfo = limbs[i];

         const offset = new Vector(Cactus.RADIUS, limbInfo.direction).convertToPoint();

         const renderPart = new RenderPart(
            Cactus.LIMB_SIZE,
            Cactus.LIMB_SIZE,
            "entities/cactus/cactus-limb.png",
            0,
            2 * Math.PI * Math.random()
         )
         renderPart.offset = offset;
         this.attachRenderPart(renderPart);
         
         if (typeof limbInfo.flower !== "undefined") {
            const flowerInfo = limbInfo.flower;

            const flowerOffset = new Vector(flowerInfo.height, flowerInfo.direction).convertToPoint();
            flowerOffset.add(offset);

            const flowerRenderPart = new RenderPart(
               16,
               16,
               this.getFlowerTextureSource(flowerInfo.type, CactusFlowerSize.small),
               1,
               flowerInfo.rotation
            )
            flowerRenderPart.offset = flowerOffset;
            this.attachRenderPart(flowerRenderPart);
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