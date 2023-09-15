import { Point, lerp, randFloat, randInt, randSign } from "webgl-test-shared";
import Particle from "./Particle";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer, interpolateColours } from "./rendering/particle-rendering";
import Board from "./Board";
import Entity from "./entities/Entity";

const BLOOD_COLOUR_LOW: Readonly<ParticleColour> = [150, 0, 0];
const BLOOD_COLOUR_HIGH: Readonly<ParticleColour> = [212, 0, 0];

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
      interpolateColours(BLOOD_COLOUR_LOW, BLOOD_COLOUR_HIGH, Math.random())
   );
   Board.highMonocolourParticles.push(particle);
}

export enum LeafParticleSize {
   small,
   large
}

export function createLeafParticle(spawnPosition: Point, moveDirection: number, size: LeafParticleSize): void {
   // @Speed garbage collection
   
   const lifetime = randFloat(2, 2.5);

   let textureIndex: number;
   if (size === LeafParticleSize.small) {
      textureIndex = 8 * 1;
   } else {
      textureIndex = 8 * 1 + 1;
   }

   const velocity = Point.fromVectorForm(randFloat(30, 50), moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPosition.x, spawnPosition.y,
      velocity.x, velocity.y,
      0, 0,
      60,
      2 * Math.PI * Math.random(),
      Math.PI * randFloat(-1, 1),
      0,
      1.5 * Math.PI,
      textureIndex,
      [0, 0, 0]
   );
   Board.lowTexturedParticles.push(particle);
}

export function createFootprintParticle(entity: Entity, numFootstepsTaken: number, footstepOffset: number, size: number, lifetime: number): void {
   if (entity.velocity === null) {
      return;
   }

   if (entity.findCurrentTile().type === "water") {
      return;
   }

   // @Speed Garbage collection

   const footstepAngleOffset = numFootstepsTaken % 2 === 0 ? Math.PI : 0;
   const spawnPosition = entity.position.copy();
   const offset = Point.fromVectorForm(footstepOffset / 2, entity.velocity.direction + footstepAngleOffset + Math.PI/2);
   spawnPosition.add(offset);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      // return lerp(0.75, 0, particle.age / lifetime);
      // @Temporary
      return 1 - particle.age / lifetime;
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      size, size,
      spawnPosition.x, spawnPosition.y,
      0, 0,
      0, 0,
      0,
      entity.velocity.direction,
      0,
      0,
      0,
      4,
      [0, 0, 0]
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
      [0, 0, 0]
   );
   Board.lowTexturedParticles.push(particle);
}
   
export function createRockParticle(spawnPosition: Point, moveDirection: number): void {
   // @Speed garbage collection
   
   const lifetime = randFloat(0.3, 0.6);

   let textureIndex: number;
   if (Math.random() < 0.5) {
      // Large rock
      textureIndex = 8 * 1 + 3;
   } else {
      // Small rock
      textureIndex = 8 * 1 + 2;
   }

   const velocityMagnitude = randFloat(80, 125);

   const velocity = Point.fromVectorForm(velocityMagnitude, moveDirection);
   const acceleration = Point.fromVectorForm(velocityMagnitude / lifetime / 1.25, moveDirection + Math.PI);

   const spinDirection = randFloat(-1, 1);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPosition.x, spawnPosition.y,
      velocity.x, velocity.y,
      acceleration.x, acceleration.y,
      0,
      2 * Math.PI * Math.random(),
      2 * Math.PI * spinDirection,
      0,
      Math.abs(Math.PI * spinDirection),
      textureIndex, [0, 0, 0]);
   Board.lowTexturedParticles.push(particle);
}

export function createDirtParticle(spawnPosition: Point): void {
   // @Speed Garbage collection
   
   const offset = Point.fromVectorForm(10 * Math.random(), 2 * Math.PI * Math.random());
   spawnPosition.add(offset);

   const speedMultiplier = randFloat(1, 2.2);

   const velocity = Point.fromVectorForm(80 * speedMultiplier, 2 * Math.PI * Math.random());

   const particle = new Particle(1.5);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPosition.x, spawnPosition.y,
      velocity.x, velocity.y,
      0, 0,
      300,
      2 * Math.PI * Math.random(),
      Math.PI * randFloat(3, 4) * randSign(),
      0,
      Math.PI,
      3,
      [0, 0, 0]
   );
   Board.lowTexturedParticles.push(particle);
}

const SNOW_PARTICLE_COLOUR_LOW: ParticleColour = [164/255, 175/255, 176/255];
const SNOW_PARTICLE_COLOUR_HIGH: ParticleColour = [199/255, 209/255, 209/255];

export function createSnowParticle(spawnPositionX: number, spawnPositionY: number, moveSpeed: number): void {
   const lifetime = randFloat(0.6, 0.8);

   // @Speed garbage collection
   const velocity = Point.fromVectorForm(moveSpeed, 2 * Math.PI * Math.random());
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const pixelSize = 4 * randInt(1, 2);
   
   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocity.x, velocity.y,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      interpolateColours(SNOW_PARTICLE_COLOUR_LOW, SNOW_PARTICLE_COLOUR_HIGH, Math.random())
   );
   Board.lowMonocolourParticles.push(particle);
}