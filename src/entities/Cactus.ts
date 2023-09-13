import { EntityType, Point, CactusFlowerSize, CactusBodyFlowerData, CactusLimbData, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { ParticleRenderLayer } from "../particles/Particle";
import Board from "../Board";
import MonocolourParticle from "../particles/MonocolourParticle";
import { ParticleColour, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";
import TexturedParticle from "../particles/TexturedParticle";

class Cactus extends Entity {
   private static readonly CACTUS_SPINE_PARTICLE_COLOUR: ParticleColour = [0, 0, 0];

   private static readonly FLOWER_PARTICLE_FADE_TIME = 1;
   
   private static readonly RADIUS = 40;

   private static readonly LIMB_SIZE = 36;

   public type: EntityType = "cactus";

   private readonly flowerData: ReadonlyArray<CactusBodyFlowerData>;
   private readonly limbData: ReadonlyArray<CactusLimbData>;

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

      this.flowerData = flowers;
      this.limbData = limbs;

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

         const offset = Point.fromVectorForm(Cactus.RADIUS, limbInfo.direction);

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

            const flowerOffset = Point.fromVectorForm(flowerInfo.height, flowerInfo.direction);
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
      const spawnPosition = Point.fromVectorForm(Cactus.RADIUS - 5, flyDirection);
      spawnPosition.add(this.position);
      
      const lifetime = randFloat(0.2, 0.3);

      const velocity = Point.fromVectorForm(randFloat(150, 200), flyDirection);

      const particle = new MonocolourParticle(lifetime);
      particle.getOpacity = (age: number) => {
         return 1 - age / lifetime;
      };

      addMonocolourParticleToBufferContainer(particle, 4, 16, spawnPosition.x, spawnPosition.y, velocity.x, velocity.y, 0, 0, flyDirection, 0, 0, Cactus.CACTUS_SPINE_PARTICLE_COLOUR);
      Board.addMonocolourParticle(particle, ParticleRenderLayer.high)
   }

   public onDie(): void {
      // @Speed Garbage collection
      
      for (const flower of this.flowerData) {
         const flowerPosition = this.position.copy();
         const offsetDirection = flower.column * Math.PI / 4;
         const flowerOffset = Point.fromVectorForm(flower.height, offsetDirection);
         flowerPosition.add(flowerOffset);

         this.createFlowerParticle(flowerPosition, flower.type, flower.size, flower.rotation);
      }

      for (const limb of this.limbData) {
         if (typeof limb.flower !== "undefined") {
            const limbPosition = this.position.copy();
            const offset = Point.fromVectorForm(Cactus.RADIUS, limb.direction);
            limbPosition.add(offset);

            const flowerPosition = limbPosition.copy();
            const flowerOffset = Point.fromVectorForm(limb.flower.height, limb.flower.direction);
            flowerPosition.add(flowerOffset);

            this.createFlowerParticle(flowerPosition, limb.flower.type, CactusFlowerSize.small, limb.flower.rotation);
         }
      }
   }

   private createFlowerParticle(spawnPosition: Point, flowerType: number, size: CactusFlowerSize, rotation: number): void {
      const velocity = Point.fromVectorForm(randFloat(30, 50), 2 * Math.PI * Math.random());
      
      const lifetime = randFloat(3, 5);
      
      const particle = new TexturedParticle(lifetime);
      
      // @Incomplete
      const textureIndex = this.getFlowerTextureIndex(flowerType, size);
      addTexturedParticleToBufferContainer(particle, 64, 64, spawnPosition.x, spawnPosition.y, velocity.x, velocity.y, 0, 0, textureIndex, rotation, Math.PI * randFloat(-1, 1), 1.5 * Math.PI);
      Board.addTexturedParticle(particle, ParticleRenderLayer.low);
   }

   private getFlowerTextureIndex(flowerType: number, size: CactusFlowerSize): number {
      switch (flowerType) {
         case 0: {
            if (size === CactusFlowerSize.small) {
               return 8 * 2;
            } else {
               return 8 * 2 + 4;
            }
         }
         case 1: {
            if (size === CactusFlowerSize.small) {
               return 8 * 2 + 1;
            } else {
               return 8 * 2 + 5;
            }
         }
         case 2: {
            if (size === CactusFlowerSize.small) {
               return 8 * 2 + 2;
            } else {
               return 8 * 2 + 6;
            }
         }
         case 3: {
            if (size === CactusFlowerSize.small) {
               return 8 * 2 + 3;
            } else {
               return 8 * 2 + 7;
            }
         }
         case 4: {
            return 8 * 3;
         }
         default: {
            throw new Error(`Unknown flower type '${flowerType}'.`);
         }
      }
   }
}

export default Cactus;