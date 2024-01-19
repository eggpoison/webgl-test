import { EntityType, Point, lerp, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";
import { playSound } from "../sound";
import Board from "../Board";
import Particle from "../Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";

export function createLightWoodSpeckParticle(originX: number, originY: number, offset: number): void {
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.4);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const colourLerp = Math.random();
   const r = lerp(197/255, 215/255, colourLerp);
   const g = lerp(151/255, 180/255, colourLerp);
   const b = lerp(68/255, 97/255, colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const scale = randFloat(1, 1.5);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      4 * scale, 4 * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   );
   Board.lowMonocolourParticles.push(particle);
}

export function createWoodenWallSpawnParticles(originX: number, originY: number): void {
   for (let i = 0; i < 12; i++) {
      createLightWoodSpeckParticle(originX, originY, 32);
   }
}

class WoodenWall extends Entity {
   private static readonly SIZE = 64;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.woodenWall, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            WoodenWall.SIZE,
            WoodenWall.SIZE,
            getEntityTextureArrayIndex("entities/wooden-wall/wooden-wall.png"),
            0,
            0
         )
      );

      playSound("wooden-wall-place.mp3", 0.3, this.position.x, this.position.y);
   }

   protected onHit(): void {
      playSound("wooden-wall-hit.mp3", 0.3, this.position.x, this.position.y);
   }
   
   public onDie(): void {
      playSound("wooden-wall-break.mp3", 0.4, this.position.x, this.position.y);
   }
}

export default WoodenWall;