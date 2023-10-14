import { BaseItemInfo, ItemType, Point, SETTINGS, randFloat } from "webgl-test-shared";
import GameObject from "../GameObject";
import RenderPart from "../render-parts/RenderPart";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Board from "../Board";
import { BloodParticleSize } from "../generic-particles";
import Particle from "../Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

export function createFrozenYetiBloodParticle(size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const pixelSize = size === BloodParticleSize.large ? 8 : 4;

   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const friction = hasDrag ? moveSpeed / lifetime / 1.2 : 0;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   let r = 90/255;
   let g = 159/255;
   let b = 205/255;
   const darkenFactor = randFloat(-0.3, 0.2);
   r -= darkenFactor;
   g -= darkenFactor;
   b -= darkenFactor;

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      friction,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      r, g, b
   );
   Board.highMonocolourParticles.push(particle);
}

class DroppedItem extends GameObject implements BaseItemInfo {
   public readonly itemType: ItemType;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, velocity: Point, itemType: ItemType) {
      super(position, hitboxes, id, renderDepth);
      
      this.velocity = velocity;
      this.itemType = itemType;

      this.attachRenderPart(
         new RenderPart(
            this,
            SETTINGS.ITEM_SIZE * 2,
            SETTINGS.ITEM_SIZE * 2,
            getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemType].textureSource),
            0,
            0
         )
      );
   }

   public tick(): void {
      super.tick();

      // Make the deep frost heart item spew blue blood particles
      if (this.itemType === ItemType.deepfrost_heart && Board.tickIntervalHasPassed(0.4)) {
         for (let i = 0; i < 6; i++) {
            const spawnPositionOffsetMagnitude = 13;
            const spawnPositionOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = this.position.x + spawnPositionOffsetMagnitude * Math.sin(spawnPositionOffsetDirection);
            const spawnPositionY = this.position.y + spawnPositionOffsetMagnitude * Math.cos(spawnPositionOffsetDirection);
            createFrozenYetiBloodParticle(BloodParticleSize.small, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(40, 60), true);
         }
      }
   }
}

export default DroppedItem;