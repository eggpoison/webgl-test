// @Cleanup this shouldn't be here
export enum ParticleRenderLayer {
   low, // Below game objects
   high // Above game objects
}

export enum ParticleRenderType {
   monocolour = 0, // Particle with one colour
   textured = 1    // Particle with texture
}

let idCounter = 0;

const getAvailableID = (): number => {
   return idCounter++;
}

class Particle {
   public readonly id = getAvailableID();

   public age = 0;
   public readonly lifetime: number;
   
   constructor(lifetime: number) {
      this.lifetime = lifetime;
   }

   public getOpacity?(): number;
   public getScale?(): number;
}

export default Particle;