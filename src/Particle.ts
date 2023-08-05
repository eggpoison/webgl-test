import { ParticleData, ParticleType, Point, Vector } from "webgl-test-shared";

export enum ParticleRenderLayer {
   low, // Below game objects
   high // Above game objects
}

interface ParticleInfo {
   readonly size: [width: number, height: number];
   readonly renderLayer: ParticleRenderLayer;
}

const PARTICLE_INFO: Record<ParticleType, ParticleInfo> = {
   [ParticleType.bloodPoolSmall]: {
      size: [20, 20],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.bloodPoolMedium]: {
      size: [28, 28],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.bloodPoolLarge]: {
      size: [40, 40],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.blood]: {
      size: [4, 4],
      renderLayer: ParticleRenderLayer.high
   },
   [ParticleType.cactusSpine]: {
      size: [4, 16],
      renderLayer: ParticleRenderLayer.high
   }
};

let idCounter = 0;

const getAvailableID = (): number => {
   return idCounter++;
}

class Particle {
   public readonly id: number;

   public readonly type: ParticleType;
   
   public position: Point;
   public velocity: Vector | null;
   public acceleration: Vector | null;
   public rotation: number;
   public opacity: number;

   public readonly width: number;
   public readonly height: number;

   public readonly renderLayer: ParticleRenderLayer;

   constructor(data: ParticleData) {
      this.id = getAvailableID();

      this.type = data.type;
      
      this.position = Point.unpackage(data.position);
      this.velocity = data.velocity !== null ? Vector.unpackage(data.velocity) : null;
      this.acceleration = data.acceleration !== null ? Vector.unpackage(data.acceleration) : null;
      this.rotation = data.rotation;
      this.opacity = data.opacity;

      [this.width, this.height] = PARTICLE_INFO[data.type].size;
      this.renderLayer = PARTICLE_INFO[data.type].renderLayer;
   }

   public tick(): void {

   }

   public updateFromData(data: ParticleData): void {
      this.position = Point.unpackage(data.position);
      this.velocity = data.velocity !== null ? Vector.unpackage(data.velocity) : null;
      this.acceleration = data.acceleration !== null ? Vector.unpackage(data.acceleration) : null;
      this.rotation = data.rotation;
      this.opacity = data.opacity;
   }
}

export default Particle;