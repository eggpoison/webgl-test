import Particle from "./Particle";

export type ParticleTint = [r: number, g: number, b: number];

class TexturedParticle extends Particle {
   /** Each element indicates the modifier for the texture's colour from -1->1, where 0 doesn't affect the colour */
   public tint: ParticleTint = [0, 0, 0];
}

export default TexturedParticle;