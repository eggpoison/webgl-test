import { ParticleTint, Point, TexturedParticleData, Vector } from "webgl-test-shared";
import Particle from "./Particle";
import { ParticleTextureSource } from "../rendering/particle-rendering";

class TexturedParticle extends Particle {
   public readonly textureSource: ParticleTextureSource;
   
   /** Each element indicates the modifier for the texture's colour from -1->1, where 0 doesn't affect the colour */
   public tint: ParticleTint = [0, 0, 0];

   constructor(id: number | null, width: number, height: number, position: Point, initialVelocity: Vector | null, initialAcceleration: Vector | null, lifetime: number, textureSource: ParticleTextureSource) {
      super(id, width, height, position, initialVelocity, initialAcceleration, lifetime);

      this.textureSource = textureSource;
   }
   
   public updateFromData(data: TexturedParticleData): void {
      super.updateFromData(data);

      this.tint = data.tint;
   }
}

export default TexturedParticle;