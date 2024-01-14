import { EntityData, EntityType, Point, SlimeOrbData, SlimeSize, TileType, lerp } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../generic-particles";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class Slime extends Entity {
   private static readonly SIZES: ReadonlyArray<number> = [
      64, // small
      88, // medium
      120 // large
   ];
   private static readonly SIZE_STRINGS: ReadonlyArray<string> = ["small", "medium", "large"];

   private static readonly ORB_SIZES: ReadonlyArray<number> = [
      16,
      20,
      28
   ];

   private static readonly EYE_OFFSETS: ReadonlyArray<number> = [16, 24, 34];
   private static readonly EYE_WIDTHS: ReadonlyArray<number> = [28, 40, 52];
   private static readonly EYE_HEIGHTS: ReadonlyArray<number> = [12, 20, 24];

   private static readonly EYE_SHAKE_START_FREQUENCY = 0.5;
   private static readonly EYE_SHAKE_END_FREQUENCY = 1.25;
   private static readonly EYE_SHAKE_START_AMPLITUDE = 0.07;
   private static readonly EYE_SHAKE_END_AMPLITUDE = 0.2;

   private static readonly NUM_PUDDLE_PARTICLES_ON_HIT: ReadonlyArray<number> = [1, 2, 3];
   private static readonly NUM_PUDDLE_PARTICLES_ON_DEATH: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_HIT: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_DEATH: ReadonlyArray<number> = [6, 10, 15];

   public type = EntityType.slime as const;

   private readonly bodyRenderPart: RenderPart;
   private readonly eyeRenderPart: RenderPart;
   private readonly orbRenderParts = new Array<RenderPart>();

   private readonly size: number;

   private numOrbs: number;
   private readonly orbRotations = new Array<number>();

   private internalTickCounter = 0;

   constructor(position: Point, id: number, renderDepth: number, size: SlimeSize, eyeRotation: number, orbs: ReadonlyArray<SlimeOrbData>, spitChargeProgress: number) {
      super(position, id, EntityType.slime, renderDepth);

      const spriteSize = Slime.SIZES[size];

      const sizeString = Slime.SIZE_STRINGS[size];

      this.size = size;

      // Body
      this.bodyRenderPart = new RenderPart(
         this,
         spriteSize,
         spriteSize,
         getGameObjectTextureArrayIndex(`entities/slime/slime-${sizeString}-body.png`),
         2,
         0
      );
      this.bodyRenderPart.shakeAmount = this.createBodyShakeAmount(spitChargeProgress);
      this.attachRenderPart(this.bodyRenderPart);

      // Eye
      this.eyeRenderPart = new RenderPart(
         this,
         Slime.EYE_WIDTHS[size],
         Slime.EYE_HEIGHTS[size],
         getGameObjectTextureArrayIndex(`entities/slime/slime-${sizeString}-eye.png`),
         3,
         eyeRotation
      );
      this.eyeRenderPart.offset = Point.fromVectorForm(Slime.EYE_OFFSETS[this.size], eyeRotation);
      this.eyeRenderPart.inheritParentRotation = false;
      this.attachRenderPart(this.eyeRenderPart);

      // Shading
      this.attachRenderPart(new RenderPart(
         this,
         spriteSize,
         spriteSize,
         getGameObjectTextureArrayIndex(`entities/slime/slime-${sizeString}-shading.png`),
         0,
         0
      ));

      this.numOrbs = orbs.length;
      for (let i = 0; i < orbs.length; i++) {
         const orb = orbs[i];
         this.createOrbRenderPart(orb, i);
      }
   }

   private createOrbRenderPart(orbData: SlimeOrbData, i: number): void {
      const sizeString = Slime.SIZE_STRINGS[orbData.size];
      
      const orbSize = Slime.ORB_SIZES[orbData.size];
      
      // Calculate the orb's offset from the center of the slime
      const spriteSize = Slime.SIZES[this.size];
      const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orbData.offset);

      this.orbRotations.push(orbData.rotation);

      this.orbRenderParts[i] = new RenderPart(
         this,
         orbSize,
         orbSize,
         getGameObjectTextureArrayIndex(`entities/slime/slime-orb-${sizeString}.png`),
         1,
         orbData.rotation
      );
      this.orbRenderParts[i].offset = Point.fromVectorForm(offsetMagnitude, this.orbRotations[i]);
      this.attachRenderPart(this.orbRenderParts[i]);
   }

   protected overrideTileMoveSpeedMultiplier(): number | null {
      // Slimes move at normal speed on slime blocks
      if (this.tile.type === TileType.slime) {
         return 1;
      }
      return null;
   }

   public updateFromData(entityData: EntityData<EntityType.slime>): void {
      super.updateFromData(entityData);

      // 
      // Update the eye's rotation
      // 

      const anger = entityData.clientArgs[3];
      this.eyeRenderPart.rotation = entityData.clientArgs[1];
      if (anger >= 0) {
         const frequency = lerp(Slime.EYE_SHAKE_START_FREQUENCY, Slime.EYE_SHAKE_END_FREQUENCY, anger);
         this.internalTickCounter += frequency;

         let amplitude = lerp(Slime.EYE_SHAKE_START_AMPLITUDE, Slime.EYE_SHAKE_END_AMPLITUDE, anger) * 100;
         amplitude /= Math.PI * Slime.SIZES[this.size];
         this.eyeRenderPart.rotation += amplitude * Math.sin(this.internalTickCounter * 3);
      } else {
         this.internalTickCounter = 0;
      }

      (this.eyeRenderPart.offset as Point).x = Slime.EYE_OFFSETS[this.size] * Math.sin(this.eyeRenderPart.rotation);
      (this.eyeRenderPart.offset as Point).y = Slime.EYE_OFFSETS[this.size] * Math.cos(this.eyeRenderPart.rotation);

      for (let i = 0; i < entityData.clientArgs[2].length; i++) {
         const orb = entityData.clientArgs[2][i];
         if (i >= this.numOrbs) {
            this.createOrbRenderPart(orb, i);
         } else {
            // Update the orb's rotation
            if (this.orbRotations[i] !== orb.rotation) {
               const spriteSize = Slime.SIZES[this.size];
               const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orb.offset);
               (this.orbRenderParts[i].offset as Point).x = offsetMagnitude * Math.sin(orb.rotation);
               (this.orbRenderParts[i].offset as Point).y = offsetMagnitude * Math.cos(orb.rotation);
            }
            this.orbRotations[i] = orb.rotation;
         }
      }

      this.numOrbs = entityData.clientArgs[2].length;

      const spitChargeProgress = entityData.clientArgs[4];
      this.bodyRenderPart.shakeAmount = this.createBodyShakeAmount(spitChargeProgress);
   }

   protected onHit(): void {
      const radius = Slime.SIZES[this.size] / 2;
      
      for (let i = 0; i < Slime.NUM_PUDDLE_PARTICLES_ON_HIT[this.size]; i++) {
         createSlimePoolParticle(this.position.x, this.position.y, radius);
      }

      for (let i = 0; i < Slime.NUM_SPECK_PARTICLES_ON_HIT[this.size]; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, radius * Math.random());
      }
   }

   public onDie(): void {
      const radius = Slime.SIZES[this.size] / 2;

      for (let i = 0; i < Slime.NUM_PUDDLE_PARTICLES_ON_DEATH[this.size]; i++) {
         createSlimePoolParticle(this.position.x, this.position.y, radius);
      }

      for (let i = 0; i < Slime.NUM_SPECK_PARTICLES_ON_DEATH[this.size]; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, radius * Math.random());
      }
   }

   private createBodyShakeAmount(spitProgress: number): number {
      if (spitProgress === -1) {
         return 0;
      } else {
         return lerp(0, 5, spitProgress);
      }
   }
}

export default Slime;