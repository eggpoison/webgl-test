import { EntityType, HitData, Point, SNOWBALL_SIZES, SnowballSize, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Board from "../Board";
import { createSnowParticle } from "../generic-particles";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

const getTextureSource = (size: SnowballSize): string => {
   switch (size) {
      case SnowballSize.small: {
         return "entities/snowball/snowball-small.png";
      }
      case SnowballSize.large: {
         return "entities/snowball/snowball-large.png";
      }
   }
}

class Snowball extends Entity {
   public type: EntityType = "snowball";

   private readonly size: SnowballSize;
   private readonly pixelSize: number;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, size: SnowballSize) {
      super(position, hitboxes, id, renderDepth);

      this.size = size;
      this.pixelSize = SNOWBALL_SIZES[size];

      this.attachRenderPart(
         new RenderPart(
            this,
            this.pixelSize,
            this.pixelSize,
            getGameObjectTextureArrayIndex(getTextureSource(size)),
            0,
            0
         )
      );
   }

   public tick(): void {
      super.tick();

      if ((this.velocity.x !== 0 || this.velocity.y !== 0) && this.velocity.lengthSquared() > 2500) {
         if (Board.tickIntervalHasPassed(0.05)) {
            createSnowParticle(this.position.x, this.position.y, randFloat(40, 60));
         }
      }
   }

   protected onHit(hitData: HitData): void {
      // Create a bunch of snow particles at the point of hit
      if (hitData.angleFromAttacker !== null) {
         const numParticles = this.size === SnowballSize.large ? 10 : 7;
         for (let i = 0; i < numParticles; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + this.pixelSize / 2 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + this.pixelSize / 2 * Math.cos(offsetDirection);
            this.createSnowSpeckParticle(spawnPositionX, spawnPositionY);
         }
      }
   }

   public onDie(): void {
      // Create a bunch of snow particles throughout the snowball
      const numParticles = this.size === SnowballSize.large ? 25 : 15;
      for (let i = 0; i < numParticles; i++) {
         const offsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + this.pixelSize / 2 * Math.sin(offsetDirection);
         const spawnPositionY = this.position.y + this.pixelSize / 2 * Math.cos(offsetDirection);
         this.createSnowSpeckParticle(spawnPositionX, spawnPositionY);
      }
   }

   private createSnowSpeckParticle(spawnPositionX: number, spawnPositionY: number): void {
      const lifetime = randFloat(0.3, 0.4);

      const pixelSize = randInt(4, 8);
   
      const velocityMagnitude = randFloat(40, 80);
      const velocityDirection = 2 * Math.PI * Math.random();
      const velocityX = velocityMagnitude * Math.sin(velocityDirection);
      const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
      const particle = new Particle(lifetime);
      particle.getOpacity = (): number => {
         return 1 - particle.age / lifetime;
      };
   
      const colour = randFloat(0.7, 0.95);
   
      addMonocolourParticleToBufferContainer(
         particle,
         ParticleRenderLayer.low,
         pixelSize, pixelSize,
         spawnPositionX, spawnPositionY,
         velocityX, velocityY,
         0, 0,
         velocityMagnitude / lifetime / 1.2,
         2 * Math.PI * Math.random(),
         0,
         0,
         0,
         colour, colour, colour
      );
      Board.lowMonocolourParticles.push(particle);
   }
}

export default Snowball;