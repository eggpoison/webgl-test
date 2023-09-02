import { ParticleData, ParticleTint, ParticleType, Point, SETTINGS, Vector } from "webgl-test-shared";
import Game from "./Game";

export enum ParticleRenderLayer {
   low, // Below game objects
   high // Above game objects
}

export enum ParticleRenderType {
   monocolour = 0, // Particle with one colour
   textured = 1    // Particle with texture
}

interface ParticleInfo {
   readonly width: number;
   readonly height: number;
   readonly renderLayer: ParticleRenderLayer;
   readonly renderType: ParticleRenderType;
}

// Particles can be server and client
// Server particles 

export const PARTICLE_INFO = {
   // Server
   [ParticleType.bloodPoolSmall]: {
      width: 20,
      height: 20,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.bloodPoolMedium]: {
      width: 28,
      height: 28,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.bloodPoolLarge]: {
      width: 40,
      height: 40,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Client
   [ParticleType.blood]: {
      width: 4,
      height: 4,
      renderLayer: ParticleRenderLayer.high,
      renderType: ParticleRenderType.monocolour
   },
   // Client
   [ParticleType.bloodLarge]: {
      width: 8,
      height: 8,
      renderLayer: ParticleRenderLayer.high,
      renderType: ParticleRenderType.monocolour
   },
   // Client
   [ParticleType.cactusSpine]: {
      width: 4,
      height: 16,
      renderLayer: ParticleRenderLayer.high,
      renderType: ParticleRenderType.textured
   },
   // Client
   [ParticleType.dirt]: {
      width: 8,
      height: 8,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.leaf]: {
      width: 28,
      height: 20,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Client
   [ParticleType.rock]: {
      width: 12,
      height: 12,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Client
   [ParticleType.rockLarge]: {
      width: 16,
      height: 16,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.cactusFlower1]: {
      width: 16,
      height: 16,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.cactusFlower1_2]: {
      width: 20,
      height: 20,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.cactusFlower2]: {
      width: 16,
      height: 16,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.cactusFlower2_2]: {
      width: 20,
      height: 20,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.cactusFlower3]: {
      width: 16,
      height: 16,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.cactusFlower3_2]: {
      width: 20,
      height: 20,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.cactusFlower4]: {
      width: 16,
      height: 16,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.cactusFlower4_2]: {
      width: 20,
      height: 20,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.cactusFlower5]: {
      width: 20,
      height: 20,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Server
   [ParticleType.smokeBlack]: {
      width: 32,
      height: 32,
      renderLayer: ParticleRenderLayer.high,
      renderType: ParticleRenderType.textured
   },
   // (DONE) Client
   [ParticleType.emberRed]: {
      width: 4,
      height: 4,
      renderLayer: ParticleRenderLayer.high,
      renderType: ParticleRenderType.monocolour
   },
   // (DONE) Client
   [ParticleType.emberOrange]: {
      width: 4,
      height: 4,
      renderLayer: ParticleRenderLayer.high,
      renderType: ParticleRenderType.monocolour
   },
   // Server
   [ParticleType.footprint]: {
      width: 16,
      height: 16,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // (DONE) Client
   [ParticleType.poisonDroplet]: {
      width: 12,
      height: 12,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Client
   [ParticleType.slimePuddle]: {
      width: 28,
      height: 28,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // Client ?????
   [ParticleType.waterSplash]: {
      width: 32,
      height: 32,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.textured
   },
   // (DONE) Client
   [ParticleType.waterDroplet]: {
      width: 6,
      height: 6,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.monocolour
   },
   // Client
   [ParticleType.snow]: {
      width: 4,
      height: 4,
      renderLayer: ParticleRenderLayer.low,
      renderType: ParticleRenderType.monocolour
   }
} satisfies Record<ParticleType, ParticleInfo>;

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
   public rotation: number = 0;
   public opacity: number = 1;
   public scale: number = 1;

   public drag: number = 0;
   public angularVelocity: number = 0;
   public angularAcceleration: number = 0;
   public angularDrag: number = 0;

   public age = 0;
   public readonly lifetime: number;

   /**
    * In a monocolour particle, each element indicates the corresponding RGB value from 0->1.
    * In a textured particle, each element indicates the modifier for the texture's colour from -1->1, where 0 doesn't affect the colour
    */
   public tint: ParticleTint = [0, 0, 0];
   
   constructor(id: number | null, type: ParticleType, position: Point, initialVelocity: Vector | null, initialAcceleration: Vector | null, lifetime: number) {
      // TODO: This is bad. Ideally shouldn't have to define ID in constructor, but that may not be possible
      if (id === null) {
         this.id = getAvailableID();
      } else {
         this.id = id;
      }

      this.type = type;
      this.position = position;
      this.velocity = initialVelocity;
      this.acceleration = initialAcceleration;
      this.lifetime = lifetime;

      // Add itself to the board
      const renderLayer = PARTICLE_INFO[type].renderLayer;
      const renderType = PARTICLE_INFO[type].renderType;
      if (renderLayer === ParticleRenderLayer.low) {
         if (renderType === ParticleRenderType.monocolour) {
            Game.board.lowParticlesMonocolour[this.id] = this;
         } else {
            Game.board.lowParticlesTextured[this.id] = this;
         }
      } else {
         if (renderType === ParticleRenderType.monocolour) {
            Game.board.highParticlesMonocolour[this.id] = this;
         } else {
            Game.board.highParticlesTextured[this.id] = this;
         }
      }
      // this.rotation = data.rotation;
      // this.opacity = data.opacity;
      // this.scale = data.scale;
      // this.tint = data.tint;

      // TODO: Rework
      // if (data.foodItemType !== -1) {
      //    const colour = getRandomFoodEatingParticleColour(data.foodItemType);
      //    this.tint[0] = colour[0] / 255 - 1;
      //    this.tint[1] = colour[1] / 255 - 1;
      //    this.tint[2] = colour[2] / 255 - 1;
      //    this.opacity *= colour[3] / 255;
      // }
   }
   
   public tick(): void {
      this.applyPhysics();

      this.rotation += this.angularVelocity / SETTINGS.TPS;

      // Angular acceleration
      this.angularVelocity += this.angularAcceleration / SETTINGS.TPS;
      
      // Angular drag
      // Move the angular velocity to zero
      if (this.angularVelocity !== 0) {
         const signBefore = Math.sign(this.angularVelocity);
         this.angularVelocity -= this.angularDrag * signBefore / SETTINGS.TPS;
         if (Math.sign(this.angularVelocity) !== signBefore) {
            this.angularVelocity = 0;
         }
      }
   }

   public updateOpacity(): void {
      if (typeof this.getOpacity !== "undefined") {
         this.opacity = this.getOpacity(this.age);
      }
   }

   private applyPhysics(): void {
      // Accelerate
      if (this.acceleration !== null) {
         const acceleration = this.acceleration.copy();
         acceleration.magnitude *= 1 / SETTINGS.TPS;

         // Add acceleration to velocity
         if (this.velocity !== null) {
            this.velocity.add(acceleration);
         } else {
            this.velocity = acceleration;
         }
      }

      // Drag
      if (this.velocity !== null) {
         this.velocity.magnitude -= this.drag / SETTINGS.TPS;
         if (this.velocity.magnitude < 0) {
            this.velocity = null;
         }
      }
      
      // Apply velocity
      if (this.velocity !== null) {
         const velocity = this.velocity.copy();
         velocity.magnitude /= SETTINGS.TPS;
         this.position.add(velocity.convertToPoint());
      }
   }

   public getOpacity?(age: number): number;
   
   public updateFromData(data: ParticleData): void {
      this.position = Point.unpackage(data.position);
      this.velocity = data.velocity !== null ? Vector.unpackage(data.velocity) : null;
      this.acceleration = data.acceleration !== null ? Vector.unpackage(data.acceleration) : null;
      this.rotation = data.rotation;
      this.opacity = data.opacity;
      this.scale = data.scale;
      this.age = data.age;
   }
}

export default Particle;