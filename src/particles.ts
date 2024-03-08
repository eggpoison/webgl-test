import { CactusFlowerSize, Point, angle, lerp, randFloat, randInt, randItem, randSign } from "webgl-test-shared";
import Particle from "./Particle";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "./rendering/particle-rendering";
import Board from "./Board";
import GameObject, { getRandomPointInEntity } from "./GameObject";

const BLOOD_COLOUR_LOW: Readonly<ParticleColour> = [150, 0, 0];
const BLOOD_COLOUR_HIGH: Readonly<ParticleColour> = [212, 0, 0];

const BURNING_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [
   [255/255, 102/255, 0],
   [255/255, 184/255, 61/255]
];

export enum BloodParticleSize {
   small,
   large
}

export function createBloodParticle(size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const pixelSize = size === BloodParticleSize.large ? 8 : 4;

   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const friction = hasDrag ? moveSpeed / lifetime / 1.2 : 0;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const colourLerp = Math.random();
   const r = lerp(BLOOD_COLOUR_LOW[0], BLOOD_COLOUR_HIGH[0], colourLerp);
   const g = lerp(BLOOD_COLOUR_LOW[1], BLOOD_COLOUR_HIGH[1], colourLerp);
   const b = lerp(BLOOD_COLOUR_LOW[2], BLOOD_COLOUR_HIGH[2], colourLerp);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      friction,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      r, g, b
   );
   Board.highMonocolourParticles.push(particle);
}

const BLOOD_FOUNTAIN_RAY_COUNT = 5;

export function createBloodParticleFountain(entity: GameObject, interval: number, speedMultiplier: number): void {
   const offset = 2 * Math.PI * Math.random();

   for (let i = 0; i < 4; i++) {
      Board.addTickCallback(interval * (i + 1), () => {
         for (let j = 0; j < BLOOD_FOUNTAIN_RAY_COUNT; j++) {
            let moveDirection = 2 * Math.PI / BLOOD_FOUNTAIN_RAY_COUNT * j + offset;
            moveDirection += randFloat(-0.3, 0.3);

            createBloodParticle(BloodParticleSize.large, entity.position.x, entity.position.y, moveDirection, randFloat(100, 200) * speedMultiplier, false);
         }
      });
   }
}

export enum LeafParticleSize {
   small,
   large
}

export function createLeafParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number, size: LeafParticleSize): void {
   const lifetime = randFloat(2, 2.5);

   let textureIndex: number;
   if (size === LeafParticleSize.small) {
      textureIndex = 8 * 1;
   } else {
      textureIndex = 8 * 1 + 1;
   }

   const velocityMagnitude = randFloat(30, 50);
   const velocityX = velocityMagnitude * Math.sin(moveDirection);
   const velocityY = velocityMagnitude * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      60,
      2 * Math.PI * Math.random(),
      Math.PI * randFloat(-1, 1),
      0,
      1.5 * Math.PI,
      textureIndex,
      0, 0, 0
   );
   Board.lowTexturedParticles.push(particle);
}

export function createFootprintParticle(entity: GameObject, numFootstepsTaken: number, footstepOffset: number, size: number, lifetime: number): void {
   const footstepAngleOffset = numFootstepsTaken % 2 === 0 ? Math.PI : 0;

   const velocityDirection = angle(entity.velocity.x, entity.velocity.y);

   const offsetMagnitude = footstepOffset / 2;
   const offsetDirection = velocityDirection + footstepAngleOffset + Math.PI/2;
   const spawnPositionX = entity.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const spawnPositionY = entity.position.y + offsetMagnitude * Math.cos(offsetDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return lerp(0.8, 0, particle.age / lifetime);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      size, size,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      velocityDirection,
      0,
      0,
      0,
      4,
      0, 0, 0
   );
   Board.lowTexturedParticles.push(particle);
}

export enum BloodPoolSize {
   small,
   medium,
   large
}

export function createBloodPoolParticle(originX: number, originY: number, spawnRange: number): void {
   const lifetime = 7.5;

   const offsetMagnitude = spawnRange * Math.random();
   const offsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offsetMagnitude * Math.sin(offsetDirection);
   const spawnPositionY = originY + offsetMagnitude * Math.cos(offsetDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   };

   const tint = randFloat(-0.2, 0.2);
   
   const textureIndex = randInt(0, 2);
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      textureIndex,
      tint, tint, tint
   );
   Board.lowTexturedParticles.push(particle);
}
   
export function createRockParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number): void {
   const lifetime = randFloat(0.3, 0.6);

   let textureIndex: number;
   if (Math.random() < 0.5) {
      // Large rock
      textureIndex = 8 * 1 + 3;
   } else {
      // Small rock
      textureIndex = 8 * 1 + 2;
   }

   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const accelerationMagnitude = moveSpeed / lifetime / 1.25;
   const accelerationDirection = moveDirection + Math.PI;
   const accelerationX = accelerationMagnitude * Math.sin(accelerationDirection);
   const accelerationY = accelerationMagnitude * Math.cos(accelerationDirection);

   const spinDirection = randFloat(-1, 1);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      accelerationX, accelerationY,
      0,
      2 * Math.PI * Math.random(),
      2 * Math.PI * spinDirection,
      0,
      Math.abs(Math.PI * spinDirection),
      textureIndex,
      0, 0, 0
   );
   Board.lowTexturedParticles.push(particle);
}

export function createDirtParticle(spawnPositionX: number, spawnPositionY: number): void {
   const speedMultiplier = randFloat(1, 2.2);

   const velocityDirection = 2 * Math.PI * Math.random();
   const velocityX = 80 * speedMultiplier * Math.sin(velocityDirection);
   const velocityY = 80 * speedMultiplier * Math.cos(velocityDirection);

   const particle = new Particle(1.5);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      300,
      2 * Math.PI * Math.random(),
      Math.PI * randFloat(3, 4) * randSign(),
      0,
      Math.PI,
      3,
      0, 0, 0
   );
   Board.lowTexturedParticles.push(particle);
}

const SNOW_PARTICLE_COLOUR_LOW: ParticleColour = [164/255, 175/255, 176/255];
const SNOW_PARTICLE_COLOUR_HIGH: ParticleColour = [199/255, 209/255, 209/255];

export function createSnowParticle(spawnPositionX: number, spawnPositionY: number, moveSpeed: number): void {
   const lifetime = randFloat(0.6, 0.8);

   const velocityDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(velocityDirection);
   const velocityY = moveSpeed * Math.cos(velocityDirection);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const pixelSize = 4 * randInt(1, 2);

   const colourLerp = Math.random();
   const r = lerp(SNOW_PARTICLE_COLOUR_LOW[0], SNOW_PARTICLE_COLOUR_HIGH[0], colourLerp);
   const g = lerp(SNOW_PARTICLE_COLOUR_LOW[1], SNOW_PARTICLE_COLOUR_HIGH[1], colourLerp);
   const b = lerp(SNOW_PARTICLE_COLOUR_LOW[2], SNOW_PARTICLE_COLOUR_HIGH[2], colourLerp);
   
   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      r, g, b
   );
   Board.lowMonocolourParticles.push(particle);
}

export function createWhiteSmokeParticle(spawnPositionX: number, spawnPositionY: number, strength: number): void {
   const velocityMagnitude = 125 * randFloat(0.8, 1.2) * strength;
   const velocityDirection = 2 * Math.PI * Math.random();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = Math.pow(strength, 0.75);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   }

   const sizeMultiplier = randFloat(0.7, 1);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64 * sizeMultiplier, 64 * sizeMultiplier,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.5,
      2 * Math.PI * Math.random(),
      Math.PI * randFloat(2, 3) * randSign(),
      0,
      Math.PI,
      7,
      0, 0, 0
   );
   Board.lowTexturedParticles.push(particle);
}

export function createLeafSpeckParticle(originX: number, originY: number, offset: number, lowColour: Readonly<ParticleColour>, highColour: Readonly<ParticleColour>): void {
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const colourLerp = Math.random();
   const r = lerp(lowColour[0], highColour[0], colourLerp);
   const g = lerp(lowColour[1], highColour[1], colourLerp);
   const b = lerp(lowColour[2], highColour[2], colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const scale = randFloat(1, 1.35);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      6 * scale, 6 * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.5,
      2 * Math.PI * Math.random(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   );
   Board.lowMonocolourParticles.push(particle);
}

export function createWoodSpeckParticle(originX: number, originY: number, offset: number): void {
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const colourLerp = Math.random();
   const r = lerp(64/255, 140/255, colourLerp);
   const g = lerp(31/255, 94/255, colourLerp);
   const b = lerp(2/255, 15/255, colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const scale = randFloat(1, 1.35);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      6 * scale, 6 * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.5,
      2 * Math.PI * Math.random(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   );
   Board.lowMonocolourParticles.push(particle);
}

export function createRockSpeckParticle(originX: number, originY: number, offset: number, velocityAddX: number, velocityAddY: number): void {
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityAddX + velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityAddY + velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;
   
   const colour = randFloat(0.5, 0.75);
   const scale = randFloat(1, 1.35);

   const baseSize = Math.random() < 0.6 ? 4 : 6;

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      baseSize * scale, baseSize * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.1,
      2 * Math.PI * Math.random(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      colour, colour, colour
   );
   Board.lowMonocolourParticles.push(particle);
}

export function createSlimeSpeckParticle(originX: number, originY: number, spawnOffset: number): void {
   const spawnOffsetMagnitude = spawnOffset;
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

   const lifetime = randFloat(0.5, 0.65);
   
   const size = randInt(0, 1);

   const moveSpeed = randFloat(30, 40);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const tint = randFloat(-0.4, 0.4);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      randFloat(-Math.PI, Math.PI) * 2,
      0,
      Math.PI,
      8 * 4 + size,
      tint, tint, tint
   );
   Board.highTexturedParticles.push(particle);
}

export function createSlimePoolParticle(originX: number, originY: number, spawnOffsetRange: number): void {
   const spawnOffsetMagnitude = spawnOffsetRange * Math.random();
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

   const lifetime = 7.5;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return lerp(0.75, 0, particle.age / lifetime);
   }

   const tint = randFloat(-0.2, 0.2);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      8 * 1 + 4,
      tint, tint, tint
   );
   Board.lowTexturedParticles.push(particle);
}

const WATER_DROPLET_COLOUR_LOW = [8/255, 197/255, 255/255] as const;
const WATER_DROPLET_COLOUR_HIGH = [94/255, 231/255, 255/255] as const;

export function createWaterSplashParticle(spawnPositionX: number, spawnPositionY: number): void {
   const lifetime = 1;

   const velocityMagnitude = randFloat(40, 60);
   const velocityDirection = 2 * Math.PI * Math.random()
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
      
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return lerp(0.75, 0, particle.age / lifetime);
   };

   const colourLerp = Math.random();
   const r = lerp(WATER_DROPLET_COLOUR_LOW[0], WATER_DROPLET_COLOUR_HIGH[0], colourLerp);
   const g = lerp(WATER_DROPLET_COLOUR_LOW[1], WATER_DROPLET_COLOUR_HIGH[1], colourLerp);
   const b = lerp(WATER_DROPLET_COLOUR_LOW[2], WATER_DROPLET_COLOUR_HIGH[2], colourLerp);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      6, 6,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      randFloat(2, 3) * randSign(),
      0,
      0,
      r, g, b
   );
   Board.lowMonocolourParticles.push(particle);
}

export function createSmokeParticle(spawnPositionX: number, spawnPositionY: number): void {
   const lifetime = 1.5;
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return lerp(0.5, 0, particle.age / lifetime);
   }
   particle.getScale = (): number => {
      const deathProgress = particle.age / lifetime
      return 1 + deathProgress * 2;
   }

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 30,
      0, 80,
      0,
      2 * Math.PI * Math.random(),
      0,
      0.75 * Math.PI * randFloat(-1, 1),
      0,
      5,
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}

export function createEmberParticle(spawnPositionX: number, spawnPositionY: number, initialMoveDirection: number, moveSpeed: number): void {
   const lifetime = randFloat(0.6, 1.2);

   const velocityX = moveSpeed * Math.sin(initialMoveDirection);
   const velocityY = moveSpeed * Math.cos(initialMoveDirection);

   const accelerationMagnitude = randFloat(0, 80);
   const accelerationDirection = 2 * Math.PI * Math.random();
   const accelerationX = accelerationMagnitude * Math.sin(accelerationDirection);
   const accelerationY = accelerationDirection * Math.cos(accelerationDirection);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      const opacity = 1 - particle.age / lifetime;
      return Math.pow(opacity, 0.3);
   }

   const colour = randItem(BURNING_PARTICLE_COLOURS);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, 4,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      accelerationX, accelerationY,
      0,
      2 * Math.PI * Math.random(),
      0, 
      0,
      0,
      colour[0], colour[1], colour[2]
   );
   Board.highMonocolourParticles.push(particle);
}

export function createPoisonBubble(spawnPositionX: number, spawnPositionY: number, opacity: number) {
   const lifetime = randFloat(0.2, 0.3);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return (1 - particle.age / lifetime) * opacity;
   };

   const size = randInt(0, 1);
   
   const purp = Math.random() / 3;

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      moveSpeed / lifetime / 1.1,
      2 * Math.PI * Math.random(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      5 * 8 + 1 + size,
      // 0, randFloat(-0.2, 0.3), 0
      lerp(0, 1, purp), lerp(randFloat(-0.2, 0.3), -1, purp), lerp(0, 1, purp)
   );
   Board.highTexturedParticles.push(particle);
}

export function createFlyParticle(x: number, y: number): void {
   // @Incomplete: once particles are much more like game objects, make flies actually fly around and stuff
   
   const lifetime = randFloat(0.5, 1);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);
   
   const accelerateMagnitude = randFloat(75, 150);
   const accelerateDirection = 2 * Math.PI * Math.random();
   const accelerationX = accelerateMagnitude * Math.sin(accelerateDirection);
   const accelerationY = accelerateMagnitude * Math.cos(accelerateDirection);

   const opacity = randFloat(0.7, 1);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3) * opacity;
   };
   particle.getScale = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      accelerationX, accelerationY,
      0,
      2 * Math.PI * Math.random(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      1 * 8 + 6,
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}

export function createStarParticle(x: number, y: number): void {
   const lifetime = randFloat(0.5, 1);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const opacity = randFloat(0.7, 1);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3) * opacity;
   };
   particle.getScale = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      7 * 8 + randInt(0, 2),
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}

export function createMagicParticle(x: number, y: number): void {
   const velocityMagnitude = randFloat(30, 40);
   const velocityDirection = 2 * Math.PI * Math.random();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   particle.getScale = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   }
   
   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   // @Incomplete: fade between dark and light?
   const r = 187;
   const g = 74;
   const b = 240;
   
   const scale = randFloat(1, 1.35);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4 * scale, 4 * scale,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r / 255, g / 255, b / 255
   );
   Board.highMonocolourParticles.push(particle);
}

const HEALING_PARTICLE_TEXTURE_INDEXES = [3 * 8 + 1, 3 * 8 + 2, 3 * 8 + 3];

export function createHealingParticle(entity: GameObject, size: number): void {
   const position = getRandomPointInEntity(entity);

   const moveSpeed = randFloat(20, 30);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);
   
   const lifetime = randFloat(0.8, 1.2);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   }

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      position.x, position.y,
      velocityX, velocityY,
      0, 0,
      0,
      0,
      0,
      0,
      0,
      HEALING_PARTICLE_TEXTURE_INDEXES[size],
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}

export function createSnowflakeParticle(x: number, y: number): void {
   const moveSpeed = randFloat(20, 30);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);
   
   const lifetime = randFloat(0.8, 1.2);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   }

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      0,
      0,
      0,
      0,
      6 * 8 + randInt(1, 6),
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}

export function createPaperParticle(x: number, y: number): void {
   const moveSpeed = randFloat(20, 30);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);
   
   const lifetime = randFloat(1.5, 1.9);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / lifetime, 3);
   }

   const angularFrictionMagnitude = randFloat(2, 3.5);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      moveSpeed / lifetime * 1.1,
      2 * Math.PI * Math.random(),
      angularFrictionMagnitude * randSign(),
      0,
      angularFrictionMagnitude / lifetime * 1.1,
      3 * 8 + randInt(5, 6),
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}

const getFlowerTextureIndex = (flowerType: number, size: CactusFlowerSize): number => {
   switch (flowerType) {
      case 0: {
         if (size === CactusFlowerSize.small) {
            return 8 * 2;
         } else {
            return 8 * 2 + 4;
         }
      }
      case 1: {
         if (size === CactusFlowerSize.small) {
            return 8 * 2 + 1;
         } else {
            return 8 * 2 + 5;
         }
      }
      case 2: {
         if (size === CactusFlowerSize.small) {
            return 8 * 2 + 2;
         } else {
            return 8 * 2 + 6;
         }
      }
      case 3: {
         if (size === CactusFlowerSize.small) {
            return 8 * 2 + 3;
         } else {
            return 8 * 2 + 7;
         }
      }
      case 4: {
         return 8 * 3;
      }
      default: {
         throw new Error(`Unknown flower type '${flowerType}'.`);
      }
   }
}

export function createFlowerParticle(spawnPositionX: number, spawnPositionY: number, flowerType: number, size: CactusFlowerSize, rotation: number): void {
   const velocityMagnitude = randFloat(30, 50);
   const velocityDirection = 2 * Math.PI * Math.random();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   const lifetime = randFloat(3, 5);

   // @Incomplete
   const FLOWER_PARTICLE_FADE_TIME = 1;
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / lifetime, 3);
   }
   
   const textureIndex = getFlowerTextureIndex(flowerType, size);
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      75,
      rotation,
      Math.PI * randFloat(-1, 1),
      0,
      1.5 * Math.PI,
      textureIndex,
      0, 0, 0
   );
   Board.lowTexturedParticles.push(particle);
}

export function createCactusSpineParticle(cactus: GameObject, offset: number, flyDirection: number): void {
   // @Speed: Garbage collection
   const spawnPosition = Point.fromVectorForm(offset, flyDirection);
   spawnPosition.add(cactus.position);
   
   const lifetime = randFloat(0.2, 0.3);

   const velocity = Point.fromVectorForm(randFloat(150, 200), flyDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   };

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, 16,
      spawnPosition.x, spawnPosition.y,
      velocity.x, velocity.y,
      0, 0,
      0,
      flyDirection,
      0,
      0,
      0,
      0, 0, 0
   );
   Board.highMonocolourParticles.push(particle);
}

const FROST_PARTICLE_LOW: ParticleColour = [102/255, 165/255, 205/255];
const FROST_PARTICLE_HIGH: ParticleColour = [202/255, 239/255, 255/255];
export function createFrostShieldBreakParticle(positionX: number, positionY: number): void {
   const offsetDirection = 2 * Math.PI * Math.random();
   positionX += 32 * Math.sin(offsetDirection);
   positionY += 32 * Math.cos(offsetDirection);

   const lifetime = randFloat(0.2, 0.3);
   
   const moveSpeed = randFloat(200, 280);
   const moveDirection = offsetDirection + randFloat(-0.5, 0.5);
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   };

   const colourLerp = Math.random();
   const r = lerp(FROST_PARTICLE_LOW[0], FROST_PARTICLE_HIGH[0], colourLerp);
   const g = lerp(FROST_PARTICLE_LOW[1], FROST_PARTICLE_HIGH[1], colourLerp);
   const b = lerp(FROST_PARTICLE_LOW[2], FROST_PARTICLE_HIGH[2], colourLerp);

   const size = randInt(7, 10);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      size / 2, size,
      positionX, positionY,
      velocityX, velocityY,
      0, 0,
      0,
      moveDirection,
      0,
      0,
      0,
      r, g, b
   );
   Board.highMonocolourParticles.push(particle);
}

export function createSawdustCloud(x: number, y: number): void {
   const lifetime = randFloat(0.4, 0.7);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const opacity = randFloat(0.7, 1);
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return (1 - particle.age / lifetime) * opacity;
   };
   
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      6 * 8,
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}
      
const ARROW_DESTROY_PARTICLE_GRAY_COLOUR = [0.6, 0.6, 0.6];
const ARROW_DESTROY_PARTICLE_BROWN_COLOUR = [135/255, 75/255, 28/255];
const ARROW_DESTROY_PARTICLE_ADD_VELOCITY = 80;

export function createArrowDestroyParticle(originX: number, originY: number, velocityX: number, velocityY: number): void {
   // Offset weighted further out
   const spawnOffsetMagnitude = Math.pow(Math.random(), 0.5) * 40;
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

   let velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   let particleVelocityX = velocityMagnitude * Math.sin(velocityDirection);
   let particleVelocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   // Add the destroy velocity
   const arrowVelocityLength = Math.sqrt(velocityX * velocityX + velocityY + velocityY);
   const velocityAddMagnitude = ARROW_DESTROY_PARTICLE_ADD_VELOCITY * Math.random();
   particleVelocityX += velocityAddMagnitude * velocityX / arrowVelocityLength;
   particleVelocityY += velocityAddMagnitude * velocityY / arrowVelocityLength;
   
   const lifetime = randFloat(0.3, 0.5);
   
   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   }
   
   let r: number;
   let g: number;
   let b: number;
   if (Math.random() < 0.5) {
      // Gray colour
      r = ARROW_DESTROY_PARTICLE_GRAY_COLOUR[0];
      g = ARROW_DESTROY_PARTICLE_GRAY_COLOUR[1];
      b = ARROW_DESTROY_PARTICLE_GRAY_COLOUR[2];
   } else {
      // Brown colour
      r = ARROW_DESTROY_PARTICLE_BROWN_COLOUR[0];
      g = ARROW_DESTROY_PARTICLE_BROWN_COLOUR[1];
      b = ARROW_DESTROY_PARTICLE_BROWN_COLOUR[2];
   }
   
   const size = randInt(4, 6);
   
   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      size, size,
      spawnPositionX, spawnPositionY,
      particleVelocityX, particleVelocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.5,
      2 * Math.PI * Math.random(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   )
   Board.lowMonocolourParticles.push(particle);
}

export function createBiteParticle(spawnPositionX: number, spawnPositionY: number): void {
   const lifetime = 0.4;

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / lifetime, 1.5);
   }

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      Math.PI,
      0,
      0,
      0,
      8 * 3 + 4,
      0, 0, 0
   );

   Board.highTexturedParticles.push(particle);
}

export function createBlueBloodPoolParticle(originX: number, originY: number, spawnRange: number): void {
   const lifetime = 11;

   const offsetMagnitude = spawnRange * Math.random();
   const offsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offsetMagnitude * Math.sin(offsetDirection);
   const spawnPositionY = originY + offsetMagnitude * Math.cos(offsetDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   };

   const textureIndex = randInt(0, 2);
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      textureIndex,
      randFloat(-1, -0.7), randFloat(0.3, 0.5), 1
   );
   Board.lowTexturedParticles.push(particle);
}

export function createBlueBloodParticle(size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const pixelSize = size === BloodParticleSize.large ? 8 : 4;

   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const friction = hasDrag ? moveSpeed / lifetime / 1.2 : 0;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const r = randFloat(0, 0.35);
   const g = randFloat(0.5, 0.65);
   const b = randFloat(0.75, 0.9);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      friction,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      r, g, b
   );
   Board.highMonocolourParticles.push(particle);
}

const BLUE_BLOOD_FOUNTAIN_RAY_COUNT = 7;

export function createBlueBloodParticleFountain(entity: GameObject, interval: number, speedMultiplier: number): void {
   const offset = 2 * Math.PI * Math.random();

   for (let i = 0; i < 6; i++) {
      Board.addTickCallback(interval * (i + 1), () => {
         for (let j = 0; j < BLUE_BLOOD_FOUNTAIN_RAY_COUNT; j++) {
            let moveDirection = 2 * Math.PI / BLOOD_FOUNTAIN_RAY_COUNT * j + offset;
            moveDirection += randFloat(-0.3, 0.3);

            createBlueBloodParticle(BloodParticleSize.large, entity.position.x, entity.position.y, moveDirection, randFloat(100, 200) * speedMultiplier, false);
         }
      });
   }
}