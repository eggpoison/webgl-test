import { Point, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Projectile from "./Projectile";
import Board from "../Board";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { createWhiteSmokeParticle } from "../generic-particles";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class WoodenArrowProjectile extends Projectile {
   private static readonly HEIGHT = 64;
   private static readonly WIDTH = 20;

   private static readonly DESTROY_PARTICLE_GRAY_COLOUR = [0.6, 0.6, 0.6];
   private static readonly DESTROY_PARTICLE_BROWN_COLOUR = [135/255, 75/255, 28/255];
   private static readonly DESTROY_PARTICLE_ADD_VELOCITY = 80;
   
   constructor(position: Point, id: number, renderDepth: number, data: any) {
      super(position, id, renderDepth, data);

      this.attachRenderPart(
         new RenderPart(
            this,
            WoodenArrowProjectile.WIDTH,
            WoodenArrowProjectile.HEIGHT,
            getGameObjectTextureArrayIndex("projectiles/wooden-arrow.png"),
            0,
            0
         )
      );
   }

   public onRemove(): void {
      // Create arrow break particles
      for (let i = 0; i < 6; i++) {
         // Offset weighted further out
         const spawnOffsetMagnitude = Math.pow(Math.random(), 0.5) * 40;
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      
         let velocityMagnitude = randFloat(60, 80);
         const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
         let velocityX = velocityMagnitude * Math.sin(velocityDirection);
         let velocityY = velocityMagnitude * Math.cos(velocityDirection);

         // Add the destroy velocity
         const arrowVelocityLength = this.velocity.length();
         const velocityAddMagnitude = WoodenArrowProjectile.DESTROY_PARTICLE_ADD_VELOCITY * Math.random();
         velocityX += velocityAddMagnitude * this.velocity.x / arrowVelocityLength;
         velocityY += velocityAddMagnitude * this.velocity.y / arrowVelocityLength;
         
         const lifetime = randFloat(0.3, 0.5);
      
         const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

         const particle = new Particle(lifetime);
         particle.getOpacity = () => {
            return 1 - Math.pow(particle.age / lifetime, 2);
         }

         let r: number;
         let g: number;
         let b: number;
         if (Math.random() < 0.5) {
            // Gray colour
            r = WoodenArrowProjectile.DESTROY_PARTICLE_GRAY_COLOUR[0];
            g = WoodenArrowProjectile.DESTROY_PARTICLE_GRAY_COLOUR[1];
            b = WoodenArrowProjectile.DESTROY_PARTICLE_GRAY_COLOUR[2];
         } else {
            // Brown colour
            r = WoodenArrowProjectile.DESTROY_PARTICLE_BROWN_COLOUR[0];
            g = WoodenArrowProjectile.DESTROY_PARTICLE_BROWN_COLOUR[1];
            b = WoodenArrowProjectile.DESTROY_PARTICLE_BROWN_COLOUR[2];
         }

         const size = randInt(4, 6);
         
         addMonocolourParticleToBufferContainer(
            particle,
            ParticleRenderLayer.low,
            size, size,
            spawnPositionX, spawnPositionY,
            velocityX, velocityY,
            0, 0,
            velocityMagnitude / lifetime / 1.5,
            2 * Math.PI * Math.random(),
            angularVelocity,
            0,
            Math.abs(angularVelocity) / lifetime / 1.5,
            r, g, b
         )
         Board.lowMonocolourParticles.push(particle);
      }
   
      // White smoke particles
      for (let i = 0; i < 2; i++) {
         const spawnPositionX = this.position.x;
         const spawnPositionY = this.position.y;
         createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 0.7);
      }
   }
}

export default WoodenArrowProjectile;