import { EntityType, Point, SNOWBALL_SIZES, SnowballSize, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Board from "../Board";
import MonocolourParticle, { interpolateColours } from "../particles/MonocolourParticle";
import { ParticleRenderLayer } from "../particles/Particle";
import { ParticleColour, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";

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
   private static readonly SNOW_PARTICLE_COLOUR_LOW: ParticleColour = [164/255, 175/255, 176/255];
   private static readonly SNOW_PARTICLE_COLOUR_HIGH: ParticleColour = [199/255, 209/255, 209/255];
   
   public type: EntityType = "snowball";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, size: SnowballSize) {
      super(position, hitboxes, id);

      const textureSize = SNOWBALL_SIZES[size];

      this.attachRenderPart(
         new RenderPart(
            textureSize,
            textureSize,
            getTextureSource(size),
            0,
            0
         )
      );
   }

   public tick(): void {
      super.tick();

      if (this.velocity !== null && this.velocity.magnitude > 50) {
         if (Board.tickIntervalHasPassed(0.05)) {
            this.createSnowParticle();
         }
      }
   }

   private createSnowParticle(): void {
      const lifetime = randFloat(0.6, 0.8);

      // @Speed garbage collection
      const velocity = Point.fromVectorForm(randFloat(40, 60), 2 * Math.PI * Math.random());
      
      const particle = new MonocolourParticle(null, lifetime, interpolateColours(Snowball.SNOW_PARTICLE_COLOUR_LOW, Snowball.SNOW_PARTICLE_COLOUR_HIGH, Math.random()) );
      particle.getOpacity = (age: number): number => {
         return 1 - age / lifetime;
      };
      particle.scale = randInt(1, 2);
      addMonocolourParticleToBufferContainer(particle, 4, 4, this.position.x, this.position.y, velocity.x, velocity.y, 0, 0, 2 * Math.PI * Math.random(), 0, 0);
      Board.addMonocolourParticle(particle, ParticleRenderLayer.low);
   }
}

export default Snowball;