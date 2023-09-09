import { EntityType, ParticleColour, Point, SNOWBALL_SIZES, SnowballSize, Vector, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Board from "../Board";
import MonocolourParticle, { interpolateColours } from "../particles/MonocolourParticle";
import { ParticleRenderLayer } from "../particles/Particle";

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
      
      const particle = new MonocolourParticle(
         null,
         4,
         4,
         this.position.copy(),
         new Vector(randFloat(40, 60), 2 * Math.PI * Math.random()),
         null,
         lifetime,
         interpolateColours(Snowball.SNOW_PARTICLE_COLOUR_LOW, Snowball.SNOW_PARTICLE_COLOUR_HIGH, Math.random())
      );
      particle.getOpacity = (age: number): number => {
         return 1 - age / lifetime;
      };
      particle.rotation = 2 * Math.PI * Math.random();
      particle.scale = randInt(1, 2);
      Board.addMonocolourParticle(particle, ParticleRenderLayer.low);
   }
}

export default Snowball;