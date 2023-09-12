import { lerp } from "webgl-test-shared";
import Particle from "./Particle";
import { ParticleColour } from "../rendering/particle-rendering";

export function interpolateColours(startColour: Readonly<ParticleColour>, endColour: Readonly<ParticleColour>, amount: number): ParticleColour {
   return [
      lerp(startColour[0], endColour[0], amount),
      lerp(startColour[1], endColour[1], amount),
      lerp(startColour[2], endColour[2], amount)
   ];
}

class MonocolourParticle extends Particle {
   public colour: ParticleColour;

   constructor(lifetime: number, colour: ParticleColour) {
      super(lifetime);

      this.colour = colour;
   }
}

export default MonocolourParticle;