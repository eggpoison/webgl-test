import { EntityData, EntityType, HitData, Point, lerp, randFloat } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import { createWoodSpeckParticle } from "../generic-particles";
import { GAME_OBJECT_TEXTURE_SLOT_INDEXES, getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import Particle from "../Particle";
import Board from "../Board";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";

const createSnowSpeckParticle = (originX: number, originY: number, offset: number): void => {
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const colourLerp = Math.random();
   const r = lerp(203/255, 1, colourLerp);
   const g = lerp(195/255, 1, colourLerp);
   const b = lerp(186/255, 1, colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const scale = randFloat(1, 1.35);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      6 * scale, 6 * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.5,
      2 * Math.PI * Math.random(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   );
   Board.lowMonocolourParticles.push(particle);
}

// @Cleanup: Copy and paste
class BerrySnowbush extends Entity {
   private static readonly RADIUS = 40;

   public readonly type = EntityType.berry_snowbush;

   private static readonly TEXTURE_SOURCES = [
      "entities/berry-snowbush/berry-snowbush-1.png",
      "entities/berry-snowbush/berry-snowbush-2.png",
      "entities/berry-snowbush/berry-snowbush-3.png",
      "entities/berry-snowbush/berry-snowbush-4.png",
      "entities/berry-snowbush/berry-snowbush-5.png",
      "entities/berry-snowbush/berry-snowbush-6.png"
   ];

   private readonly renderPart: RenderPart;

   constructor(position: Point, id: number, renderDepth: number, numBerries: number) {
      super(position, id, renderDepth);

      this.renderPart = new RenderPart(
         this,
         BerrySnowbush.RADIUS * 2,
         BerrySnowbush.RADIUS * 2,
         getGameObjectTextureArrayIndex(BerrySnowbush.TEXTURE_SOURCES[numBerries]),
         0,
         0
      );
      this.attachRenderPart(this.renderPart);
   }

   public updateFromData(entityData: EntityData<EntityType.berry_bush>): void {
      super.updateFromData(entityData);

      const numBerries = entityData.clientArgs[0];
      this.renderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(BerrySnowbush.TEXTURE_SOURCES[numBerries])];
   }

   protected onHit(hitData: HitData): void {
      // Create snow specks in random positions around the bush
      for (let i = 0; i < 5; i++) {
         createSnowSpeckParticle(this.position.x, this.position.y, BerrySnowbush.RADIUS);
      }

      // Create wood specks at the point of hit
      const spawnOffsetDirection = (hitData.angleFromAttacker || 2 * Math.PI * Math.random()) + Math.PI;
      const spawnPositionX = this.position.x + (BerrySnowbush.RADIUS + 4) * Math.sin(spawnOffsetDirection);
      const spawnPositionY = this.position.y + (BerrySnowbush.RADIUS + 4) * Math.cos(spawnOffsetDirection);
      for (let i = 0; i < 4; i++) {
         createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 9; i++) {
         createSnowSpeckParticle(this.position.x, this.position.y, BerrySnowbush.RADIUS * Math.random());
      }
      for (let i = 0; i < 7; i++) {
         createWoodSpeckParticle(this.position.x, this.position.y, BerrySnowbush.RADIUS * Math.random());
      }
   }
}

export default BerrySnowbush;