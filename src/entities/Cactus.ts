import { Point, CactusFlowerSize, CactusBodyFlowerData, CactusLimbData, randFloat, randInt, EntityType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import Particle from "../Particle";
import Board from "../Board";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class Cactus extends Entity {
   private static readonly CACTUS_SPINE_PARTICLE_COLOUR: ParticleColour = [0, 0, 0];

   private static readonly FLOWER_PARTICLE_FADE_TIME = 1;
   
   private static readonly RADIUS = 40;

   private static readonly LIMB_SIZE = 36;

   private readonly flowerData: ReadonlyArray<CactusBodyFlowerData>;
   private readonly limbData: ReadonlyArray<CactusLimbData>;

   constructor(position: Point, id: number, renderDepth: number, flowers: ReadonlyArray<CactusBodyFlowerData>, limbs: ReadonlyArray<CactusLimbData>) {
      super(position, id, EntityType.cactus, renderDepth);

      const baseRenderPart = new RenderPart(
         this,
         Cactus.RADIUS * 2,
         Cactus.RADIUS * 2,
         getEntityTextureArrayIndex("entities/cactus/cactus.png"),
         2,
         0
      );
      this.attachRenderPart(baseRenderPart);

      this.flowerData = flowers;
      this.limbData = limbs;

      // Attach flower render parts
      for (let i = 0; i < flowers.length; i++) {
         const flowerInfo = flowers[i];

         const flowerSize = (flowerInfo.type === 4 || flowerInfo.size === CactusFlowerSize.large) ? 20 : 16;

         const renderPart = new RenderPart(
            this,
            flowerSize,
            flowerSize,
            getEntityTextureArrayIndex(this.getFlowerTextureSource(flowerInfo.type, flowerInfo.size)),
            3 + Math.random(),
            flowerInfo.rotation
         );
         const offsetDirection = flowerInfo.column * Math.PI / 4;
         renderPart.offset = Point.fromVectorForm(flowerInfo.height, offsetDirection);
         this.attachRenderPart(renderPart);
      }

      // Limbs
      for (let i = 0; i < limbs.length; i++) {
         const limbInfo = limbs[i];

         const limbRenderPart = new RenderPart(
            baseRenderPart,
            Cactus.LIMB_SIZE,
            Cactus.LIMB_SIZE,
            getEntityTextureArrayIndex("entities/cactus/cactus-limb.png"),
            Math.random(),
            2 * Math.PI * Math.random()
         )
         limbRenderPart.offset = Point.fromVectorForm(Cactus.RADIUS, limbInfo.direction);
         this.attachRenderPart(limbRenderPart);
         
         if (typeof limbInfo.flower !== "undefined") {
            const flowerInfo = limbInfo.flower;

            const flowerRenderPart = new RenderPart(
               limbRenderPart,
               16,
               16,
               getEntityTextureArrayIndex(this.getFlowerTextureSource(flowerInfo.type, CactusFlowerSize.small)),
               1 + Math.random(),
               flowerInfo.rotation
            )
            flowerRenderPart.offset = Point.fromVectorForm(flowerInfo.height, flowerInfo.direction);
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

      const particle = new Particle(lifetime);
      particle.getOpacity = () => {
         return 1 - particle.age / lifetime;
      };

      addMonocolourParticleToBufferContainer(
         particle,
         ParticleRenderLayer.high,
         4, 16,
         spawnPosition.x, spawnPosition.y,
         velocity.x, velocity.y,
         0, 0,
         0,
         flyDirection,
         0,
         0,
         0,
         Cactus.CACTUS_SPINE_PARTICLE_COLOUR[0], Cactus.CACTUS_SPINE_PARTICLE_COLOUR[1], Cactus.CACTUS_SPINE_PARTICLE_COLOUR[2]
      );
      Board.highMonocolourParticles.push(particle);
   }

   public onDie(): void {
      for (const flower of this.flowerData) {
         const offsetDirection = flower.column * Math.PI / 4;
         const spawnPositionX = this.position.x + flower.height * Math.sin(offsetDirection);
         const spawnPositionY = this.position.y + flower.height * Math.cos(offsetDirection);

         this.createFlowerParticle(spawnPositionX, spawnPositionY, flower.type, flower.size, flower.rotation);
      }

      for (const limb of this.limbData) {
         if (typeof limb.flower !== "undefined") {
            const spawnPositionX = this.position.x + Cactus.RADIUS * Math.sin(limb.direction) + limb.flower.height * Math.sin(limb.flower.direction);
            const spawnPositionY = this.position.y + Cactus.RADIUS * Math.cos(limb.direction) + limb.flower.height * Math.cos(limb.flower.direction);

            this.createFlowerParticle(spawnPositionX, spawnPositionY, limb.flower.type, CactusFlowerSize.small, limb.flower.rotation);
         }
      }
   }

   private createFlowerParticle(spawnPositionX: number, spawnPositionY: number, flowerType: number, size: CactusFlowerSize, rotation: number): void {
      const velocityMagnitude = randFloat(30, 50);
      const velocityDirection = 2 * Math.PI * Math.random();
      const velocityX = velocityMagnitude * Math.sin(velocityDirection);
      const velocityY = velocityMagnitude * Math.cos(velocityDirection);
      
      const lifetime = randFloat(3, 5);
      
      const particle = new Particle(lifetime);
      particle.getOpacity = () => {
         return 1 - Math.pow(particle.age / lifetime, 3);
      }
      
      const textureIndex = this.getFlowerTextureIndex(flowerType, size);
      addTexturedParticleToBufferContainer(
         particle,
         ParticleRenderLayer.low,
         64, 64,
         spawnPositionX, spawnPositionY,
         velocityX, velocityY,
         0, 0,
         75,
         rotation,
         Math.PI * randFloat(-1, 1),
         0,
         1.5 * Math.PI,
         textureIndex,
         0, 0, 0
      );
      Board.lowTexturedParticles.push(particle);
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