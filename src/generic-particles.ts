import { Point, Vector, randFloat, ParticleType, ParticleColour } from "webgl-test-shared";
import MonocolourParticle, { interpolateColours } from "./particles/MonocolourParticle";
import { ParticleRenderLayer } from "./particles/Particle";
import TexturedParticle from "./particles/TexturedParticle";
import { ParticleTextureSource } from "./rendering/particle-rendering";
import Board from "./Board";

const BLOOD_COLOUR_LOW: Readonly<ParticleColour> = [150, 0, 0];
const BLOOD_COLOUR_HIGH: Readonly<ParticleColour> = [212, 0, 0];

export function createBloodParticle(type: ParticleType.blood | ParticleType.bloodLarge, spawnPosition: Point, moveDirection: number, moveSpeed: number, hasDrag: boolean): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const size = type === ParticleType.bloodLarge ? 8 : 4;

   const particle = new MonocolourParticle(
      null,
      size,
      size,
      spawnPosition,
      new Vector(moveSpeed, moveDirection),
      hasDrag ? new Vector(moveSpeed / lifetime / 1.2, moveDirection + Math.PI) : null, // Slow down the blood particle
      lifetime,
      interpolateColours(BLOOD_COLOUR_LOW, BLOOD_COLOUR_HIGH, Math.random())
   );
   particle.rotation = 2 * Math.PI * Math.random();
   particle.getOpacity = (age: number): number => {
      return 1 - age / lifetime;
   };
   Board.addMonocolourParticle(particle, ParticleRenderLayer.high);
}

export enum LeafParticleSize {
   small,
   large
}

export function createLeafParticle(spawnPosition: Point, moveDirection: number, size: LeafParticleSize): void {
   const lifetime = randFloat(2, 2.5);

   let width: number;
   let height: number;
   let textureSource: ParticleTextureSource;
   if (size === LeafParticleSize.small) {
      width = 20;
      height = 12;
      textureSource = "particles/leaf-small.png";
   } else {
      width = 28;
      height = 20;
      textureSource = "particles/leaf.png";
   }

      
   const particle = new TexturedParticle(
      null,
      width,
      height,
      spawnPosition,
      new Vector(randFloat(30, 50), moveDirection),
      null,
      lifetime,
      textureSource
   );
   particle.rotation = 2 * Math.PI * Math.random();
   particle.angularVelocity = Math.PI * randFloat(-1, 1);
   particle.angularDrag = 1.5 * Math.PI;
   particle.getOpacity = (age: number): number => {
      return Math.pow(1 - age / lifetime, 0.5);
   };
   Board.addTexturedParticle(particle, ParticleRenderLayer.low);
}