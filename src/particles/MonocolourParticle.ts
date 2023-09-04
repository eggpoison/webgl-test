import { ParticleColour, Point, Vector, lerp } from "webgl-test-shared";
import Particle from "./Particle";

export function interpolateColours(startColour: Readonly<ParticleColour>, endColour: Readonly<ParticleColour>, amount: number): ParticleColour {
   return [
      lerp(startColour[0], endColour[0], amount),
      lerp(startColour[1], endColour[1], amount),
      lerp(startColour[2], endColour[2], amount)
   ];
}

class MonocolourParticle extends Particle {
   public colour: ParticleColour;

   constructor(id: number | null, width: number, height: number, position: Point, initialVelocity: Vector | null, initialAcceleration: Vector | null, lifetime: number, colour: ParticleColour) {
      super(id, width, height, position, initialVelocity, initialAcceleration, lifetime);

      this.colour = colour;
   }
}

export default MonocolourParticle;