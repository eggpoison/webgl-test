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
   [ParticleType.bloodLarge]: {
      size: [8, 8],
      renderLayer: ParticleRenderLayer.high
   },
   [ParticleType.cactusSpine]: {
      size: [4, 16],
      renderLayer: ParticleRenderLayer.high
   },
   [ParticleType.dirt]: {
      size: [8, 8],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.leaf]: {
      size: [28, 20],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.rock]: {
      size: [12, 12],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.rockLarge]: {
      size: [16, 16],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.cactusFlower1]: {
      size: [16, 16],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.cactusFlower1_2]: {
      size: [20, 20],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.cactusFlower2]: {
      size: [16, 16],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.cactusFlower2_2]: {
      size: [20, 20],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.cactusFlower3]: {
      size: [16, 16],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.cactusFlower3_2]: {
      size: [20, 20],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.cactusFlower4]: {
      size: [16, 16],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.cactusFlower4_2]: {
      size: [20, 20],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.cactusFlower5]: {
      size: [20, 20],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.smoke]: {
      size: [32, 32],
      renderLayer: ParticleRenderLayer.high
   },
   [ParticleType.footprint]: {
      size: [16, 16],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.poisonDroplet]: {
      size: [12, 12],
      renderLayer: ParticleRenderLayer.low
   },
   [ParticleType.slimePuddle]: {
      size: [28, 28],
      renderLayer: ParticleRenderLayer.low
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
   public scale: number;

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
      this.scale = data.scale;

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
      this.scale = data.scale;
   }
}

export default Particle;