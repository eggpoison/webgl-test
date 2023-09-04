import { Point, Vector, randFloat, ParticleType, ParticleColour } from "webgl-test-shared";
import MonocolourParticle, { interpolateColours } from "./particles/MonocolourParticle";
import { ParticleRenderLayer } from "./particles/Particle";
import TexturedParticle from "./particles/TexturedParticle";
import { ParticleTextureSource } from "./rendering/particle-rendering";
import Board from "./Board";

const BLOOD_COLOUR_LOW: Readonly<ParticleColour> = [150, 0, 0];
const BLOOD_COLOUR_HIGH: Readonly<ParticleColour> = [212, 0, 0];

export function createBloodParticle(hurtEntityPosition: Point, directionFromAttacker: number, offset: number): void {
   const spawnPosition = Point.fromVectorForm(offset, directionFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5));
   spawnPosition.x += hurtEntityPosition.x;
   spawnPosition.y += hurtEntityPosition.y;

   const lifetime = randFloat(0.3, 0.4);
   
   const velocityMagnitude = randFloat(150, 250);

   const type = Math.random() < 0.6 ? ParticleType.blood : ParticleType.bloodLarge;
   const size = type === ParticleType.bloodLarge ? 8 : 4;

   const particle = new MonocolourParticle(
      null,
      size,
      size,
      spawnPosition,
      new Vector(velocityMagnitude, 4 * Math.PI * (Math.random() - 0.5)),
      null,
      lifetime,
      interpolateColours(BLOOD_COLOUR_LOW, BLOOD_COLOUR_HIGH, Math.random())
   );
   particle.rotation = 2 * Math.PI * Math.random();
   particle.getOpacity = (age: number): number => {
      return 1 - age / lifetime;
   };
   particle.drag = velocityMagnitude / lifetime / 1.1;
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
   particle.drag = 75;
   particle.rotation = 2 * Math.PI * Math.random();
   particle.angularVelocity = Math.PI * randFloat(-1, 1);
   particle.angularDrag = 1.5 * Math.PI;
   particle.getOpacity = (age: number): number => {
      return Math.pow(1 - age / lifetime, 0.5);
   };
   Board.addTexturedParticle(particle, ParticleRenderLayer.low);
}