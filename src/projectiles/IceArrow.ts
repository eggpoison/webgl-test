import { EntityType, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Board from "../Board";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import GameObject from "../GameObject";
import { playSound } from "../sound";

class IceArrow extends GameObject {
   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.iceArrow, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            5 * 4,
            14 * 4,
            getEntityTextureArrayIndex("projectiles/ice-arrow.png"),
            0,
            0
         )
      );
   }

   public onRemove(): void {
      for (let i = 0; i < 6; i++) {
         this.createIceSpeckProjectile();
      }
   }

   private createIceSpeckProjectile(): void {
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = this.position.x + 4 * Math.sin(spawnOffsetDirection);
      const spawnPositionY = this.position.y + 4 * Math.cos(spawnOffsetDirection);

      const velocityMagnitude = randFloat(150, 300);
      const velocityDirection = spawnOffsetDirection + randFloat(-0.8, 0.8);
      const velocityX = velocityMagnitude * Math.sin(velocityDirection);
      const velocityY = velocityMagnitude * Math.cos(velocityDirection);
      
      const lifetime = randFloat(0.1, 0.2);
      
      const particle = new Particle(lifetime);
      particle.getOpacity = () => {
         return 1 - Math.pow(particle.age / particle.lifetime, 2);
      }

      const pixelSize = Math.random() < 0.5 ? 4 : 8;

      addMonocolourParticleToBufferContainer(
         particle,
         ParticleRenderLayer.low,
         pixelSize,
         pixelSize,
         spawnPositionX, spawnPositionY,
         velocityX, velocityY,
         0, 0,
         0,
         velocityDirection,
         0,
         0,
         0,
         140/255, 143/255, 207/255
      );
      Board.lowMonocolourParticles.push(particle);
   }

   public onDie(): void {
      playSound("arrow-hit.mp3", 0.4, this.position.x, this.position.y);
   }
}

export default IceArrow;