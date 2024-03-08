import { EntityComponentsData, EntityType, HitData, Point, SNOWBALL_SIZES, ServerComponentType, SnowballSize, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Board from "../Board";
import { createSnowParticle } from "../particles";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import SnowballComponent from "../entity-components/SnowballComponent";
import Entity from "../Entity";

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
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.snowball>) {
      super(position, id, EntityType.snowball, ageTicks);

      const snowballComponentData = componentsData[3];

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex(getTextureSource(snowballComponentData.size)),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.snowball, new SnowballComponent(this, snowballComponentData));
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
      const snowballComponent = this.getServerComponent(ServerComponentType.snowball);
      
      // Create a bunch of snow particles at the point of hit
      if (hitData.angleFromAttacker !== null) {
         const numParticles = snowballComponent.size === SnowballSize.large ? 10 : 7;
         for (let i = 0; i < numParticles; i++) {
            const pixelSize = SNOWBALL_SIZES[snowballComponent.size];
            
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + pixelSize / 2 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + pixelSize / 2 * Math.cos(offsetDirection);
            this.createSnowSpeckParticle(spawnPositionX, spawnPositionY);
         }
      }
   }

   public onDie(): void {
      const snowballComponent = this.getServerComponent(ServerComponentType.snowball);

      // Create a bunch of snow particles throughout the snowball
      const numParticles = snowballComponent.size === SnowballSize.large ? 25 : 15;
      for (let i = 0; i < numParticles; i++) {
         const pixelSize = SNOWBALL_SIZES[snowballComponent.size];
         
         const offsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + pixelSize / 2 * Math.sin(offsetDirection);
         const spawnPositionY = this.position.y + pixelSize / 2 * Math.cos(offsetDirection);
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