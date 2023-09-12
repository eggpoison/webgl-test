import { Point, lerp, randFloat, randInt, randSign } from "webgl-test-shared";
import MonocolourParticle, { interpolateColours } from "./particles/MonocolourParticle";
import { ParticleRenderLayer } from "./particles/Particle";
import TexturedParticle from "./particles/TexturedParticle";
import { ParticleColour, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "./rendering/particle-rendering";
import Board from "./Board";
import Entity from "./entities/Entity";

const BLOOD_COLOUR_LOW: Readonly<ParticleColour> = [150, 0, 0];
const BLOOD_COLOUR_HIGH: Readonly<ParticleColour> = [212, 0, 0];

export enum BloodParticleSize {
   small,
   large
}

export function createBloodParticle(size: BloodParticleSize, spawnPosition: Point, moveDirection: number, moveSpeed: number, hasDrag: boolean): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const pixelSize = size === BloodParticleSize.large ? 8 : 4;

   // @Speed garbage collection
   const velocity = Point.fromVectorForm(moveSpeed, moveDirection);

   let accelerationX: number;
   let accelerationY: number;
   if (hasDrag) {
      // Slow down the blood particle
      accelerationX = velocity.x;
      accelerationY = velocity.y;
      accelerationX *= -1 / lifetime / 1.2;
      accelerationY *= -1 / lifetime / 1.2;
   } else {
      accelerationX = 0;
      accelerationY = 0;
   }

   const particle = new MonocolourParticle(lifetime, interpolateColours(BLOOD_COLOUR_LOW, BLOOD_COLOUR_HIGH, Math.random()));
   particle.getOpacity = (age: number): number => {
      return 1 - age / lifetime;
   };

   addMonocolourParticleToBufferContainer(particle, pixelSize, pixelSize, spawnPosition.x, spawnPosition.y, velocity.x, velocity.y, accelerationX, accelerationY, 2 * Math.PI * Math.random(), 0, 0);
   Board.addMonocolourParticle(particle, ParticleRenderLayer.high);
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

   const particle = new TexturedParticle(lifetime);
   // @Incomplete
   // particle.rotation = 2 * Math.PI * Math.random();
   // particle.angularVelocity = Math.PI * randFloat(-1, 1);
   // particle.angularDrag = 1.5 * Math.PI;
   particle.getOpacity = (age: number): number => {
      return Math.pow(1 - age / lifetime, 0.5);
   };
   // @Incomplete
   addTexturedParticleToBufferContainer(particle, 64, 64, spawnPosition.x, spawnPosition.y, velocity.x, velocity.y, 0, 0, textureIndex, 0, 0, 0);
   Board.addTexturedParticle(particle, ParticleRenderLayer.low);
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

   const particle = new TexturedParticle(lifetime);
   particle.getOpacity = (age: number): number => {
      return lerp(0.75, 0, age / lifetime);
   };
   addTexturedParticleToBufferContainer(particle, size, size, spawnPosition.x, spawnPosition.y, 0, 0, 0, 0, 4, entity.velocity.direction, 0, 0);
   Board.addTexturedParticle(particle, ParticleRenderLayer.low);
}

export enum BloodPoolSize {
   small,
   medium,
   large
}

export function createBloodPoolParticle(origin: Point): void {
   const lifetime = 7.5;

   // @Speed garbage collection

   const spawnPosition = origin.copy();
   const offset = Point.fromVectorForm(20 * Math.random(), 2 * Math.PI * Math.random());
   spawnPosition.add(offset);

   const particle = new TexturedParticle(lifetime);
   particle.getOpacity = (age: number) => {
      return 1 - age / lifetime;
   };
   
   const textureIndex = randInt(0, 2);
   addTexturedParticleToBufferContainer(particle, 64, 64, spawnPosition.x, spawnPosition.y, 0, 0, 0, 0, textureIndex, 2 * Math.PI * Math.random(), 0, 0);
   Board.addTexturedParticle(particle, ParticleRenderLayer.low);
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

   // const spinDirection = randFloat(-1, 1);
   
   const particle = new TexturedParticle(lifetime);
   // @Incomplete
   // particle.rotation = 2 * Math.PI * Math.random();
   // particle.angularVelocity = 2 * Math.PI * spinDirection;
   // particle.angularDrag = Math.PI * -spinDirection;
   particle.getOpacity = (age: number): number => {
      return 1 - age/lifetime;
   };
   // @Incomplete
   addTexturedParticleToBufferContainer(particle, 64, 64, spawnPosition.x, spawnPosition.y, velocity.x, velocity.y, acceleration.x, acceleration.y, textureIndex, 0, 0, 0);
   Board.addTexturedParticle(particle, ParticleRenderLayer.low);
}

export function createDirtParticle(spawnX: number, spawnY: number): void {
   // @Speed Garbage collection
   
   const spawnPosition = new Point(spawnX, spawnY);
   const offset = Point.fromVectorForm(10 * Math.random(), 2 * Math.PI * Math.random());
   spawnPosition.add(offset);

   const speedMultiplier = randFloat(1, 2.2);

   const velocity = Point.fromVectorForm(80 * speedMultiplier, 2 * Math.PI * Math.random());

   const particle = new TexturedParticle(1.5);

   // @Incomplete: Add 300 drag/friction
   addTexturedParticleToBufferContainer(particle, 64, 64, spawnPosition.x, spawnPosition.y, velocity.x, velocity.y, 0, 0, 3, 2 * Math.PI * Math.random(),  Math.PI * randFloat(3, 4) * randSign(), -4 * speedMultiplier);
   Board.addTexturedParticle(particle, ParticleRenderLayer.low);
}

const SNOW_PARTICLE_COLOUR_LOW: ParticleColour = [164/255, 175/255, 176/255];
const SNOW_PARTICLE_COLOUR_HIGH: ParticleColour = [199/255, 209/255, 209/255];

export function createSnowParticle(spawnPositionX: number, spawnPositionY: number, moveSpeed: number): void {
   const lifetime = randFloat(0.6, 0.8);

   // @Speed garbage collection
   const velocity = Point.fromVectorForm(moveSpeed, 2 * Math.PI * Math.random());
   
   const particle = new MonocolourParticle(lifetime, interpolateColours(SNOW_PARTICLE_COLOUR_LOW, SNOW_PARTICLE_COLOUR_HIGH, Math.random()) );
   particle.getOpacity = (age: number): number => {
      return 1 - age / lifetime;
   };
   particle.scale = randInt(1, 2);
   
   addMonocolourParticleToBufferContainer(particle, 4, 4, spawnPositionX, spawnPositionY, velocity.x, velocity.y, 0, 0, 2 * Math.PI * Math.random(), 0, 0);
   Board.addMonocolourParticle(particle, ParticleRenderLayer.low);
}