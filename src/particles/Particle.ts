// @Cleanup this shouldn't be here
export enum ParticleRenderLayer {
   low, // Below game objects
   high // Above game objects
}

export enum ParticleRenderType {
   monocolour = 0, // Particle with one colour
   textured = 1    // Particle with texture
}

// interface ParticleInfo {
//    readonly width: number;
//    readonly height: number;
//    readonly renderLayer: ParticleRenderLayer;
//    readonly renderType: ParticleRenderType;
// }

// Particles can be server and client
// Server particles 

// @Incomplete
// @Cleanup this is messy, probably shouldn't be here as well
// export const PARTICLE_INFO = {
//    // Server
//    [ParticleType.bloodPoolSmall]: {
//       width: 20,
//       height: 20,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.bloodPoolMedium]: {
//       width: 28,
//       height: 28,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.bloodPoolLarge]: {
//       width: 40,
//       height: 40,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Client
//    [ParticleType.blood]: {
//       width: 4,
//       height: 4,
//       renderLayer: ParticleRenderLayer.high,
//       renderType: ParticleRenderType.monocolour
//    },
//    // Client
//    [ParticleType.bloodLarge]: {
//       width: 8,
//       height: 8,
//       renderLayer: ParticleRenderLayer.high,
//       renderType: ParticleRenderType.monocolour
//    },
//    // Client (DONE)
//    [ParticleType.cactusSpine]: {
//       width: 4,
//       height: 16,
//       renderLayer: ParticleRenderLayer.high,
//       renderType: ParticleRenderType.monocolour
//    },
//    // Client
//    [ParticleType.dirt]: {
//       width: 8,
//       height: 8,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.leaf]: {
//       width: 28,
//       height: 20,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Client
//    [ParticleType.rock]: {
//       width: 12,
//       height: 12,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Client
//    [ParticleType.rockLarge]: {
//       width: 16,
//       height: 16,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.cactusFlower1]: {
//       width: 16,
//       height: 16,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.cactusFlower1_2]: {
//       width: 20,
//       height: 20,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.cactusFlower2]: {
//       width: 16,
//       height: 16,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.cactusFlower2_2]: {
//       width: 20,
//       height: 20,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.cactusFlower3]: {
//       width: 16,
//       height: 16,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.cactusFlower3_2]: {
//       width: 20,
//       height: 20,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.cactusFlower4]: {
//       width: 16,
//       height: 16,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.cactusFlower4_2]: {
//       width: 20,
//       height: 20,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.cactusFlower5]: {
//       width: 20,
//       height: 20,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Server
//    [ParticleType.smokeBlack]: {
//       width: 32,
//       height: 32,
//       renderLayer: ParticleRenderLayer.high,
//       renderType: ParticleRenderType.textured
//    },
//    // (DONE) Client
//    [ParticleType.emberRed]: {
//       width: 4,
//       height: 4,
//       renderLayer: ParticleRenderLayer.high,
//       renderType: ParticleRenderType.monocolour
//    },
//    // (DONE) Client
//    [ParticleType.emberOrange]: {
//       width: 4,
//       height: 4,
//       renderLayer: ParticleRenderLayer.high,
//       renderType: ParticleRenderType.monocolour
//    },
//    // (DONE) Client
//    [ParticleType.poisonDroplet]: {
//       width: 12,
//       height: 12,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Client
//    [ParticleType.slimePuddle]: {
//       width: 28,
//       height: 28,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Client ?????
//    [ParticleType.waterSplash]: {
//       width: 32,
//       height: 32,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.textured
//    },
//    // Client
//    [ParticleType.snow]: {
//       width: 4,
//       height: 4,
//       renderLayer: ParticleRenderLayer.low,
//       renderType: ParticleRenderType.monocolour
//    }
// } satisfies Record<ParticleType, ParticleInfo>;

let idCounter = 0;

const getAvailableID = (): number => {
   return idCounter++;
}

abstract class Particle {
   public readonly id: number;

   public opacity: number = 1;
   public scale: number = 1;

   public age = 0;
   public readonly lifetime: number;
   
   constructor(id: number | null, lifetime: number) {
      // TODO: This is bad. Ideally shouldn't have to define ID in constructor, but that may not be possible
      // Note that clientside particles don't require an ID
      if (id === null) {
         this.id = getAvailableID();
      } else {
         this.id = id;
      }

      this.lifetime = lifetime;
   }

   public getOpacity?(age: number): number;
}

export default Particle;