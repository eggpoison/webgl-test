import { EntityData, EntityType, Point, SETTINGS, SlimeSize, TileType, lerp, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

/** Information about an orb inside a slime */
interface SlimeOrbInfo {
   readonly size: SlimeSize;
   /** Offset of the orb from the center of the slime (from 0->1) */
   readonly offset: number;
   rotation: number;
   angularVelocity: number;
}

class Slime extends Entity {
   private static readonly SIZES: ReadonlyArray<number> = [
      64, // small
      88, // medium
      120 // large
   ];
   private static readonly SIZE_STRINGS: ReadonlyArray<string> = ["small", "medium", "large"];

   private static readonly EYE_OFFSETS: ReadonlyArray<number> = [16, 24, 34];

   private static readonly EYE_SHAKE_START_FREQUENCY = 0.5;
   private static readonly EYE_SHAKE_END_FREQUENCY = 1.25;
   private static readonly EYE_SHAKE_START_AMPLITUDE = 0.07;
   private static readonly EYE_SHAKE_END_AMPLITUDE = 0.2;

   private static readonly NUM_PUDDLE_PARTICLES_ON_HIT: ReadonlyArray<number> = [1, 2, 3];
   private static readonly NUM_PUDDLE_PARTICLES_ON_DEATH: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_HIT: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_DEATH: ReadonlyArray<number> = [6, 10, 15];

   private readonly bodyRenderPart: RenderPart;
   private readonly eyeRenderPart: RenderPart;
   private readonly orbRenderParts = new Array<RenderPart>();

   private readonly size: number;

   private readonly orbs = new Array<SlimeOrbInfo>();

   private internalTickCounter = 0;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, size: SlimeSize, eyeRotation: number, orbSizes: ReadonlyArray<SlimeSize>, spitChargeProgress: number) {
      super(position, id, EntityType.slime, ageTicks, renderDepth);

      this.size = size;

      // Create initial orbs
      for (let i = 0; i < orbSizes.length; i++) {
         const size = orbSizes[i];
         this.createOrb(size);
      }

      const sizeString = Slime.SIZE_STRINGS[size];

      // Body
      this.bodyRenderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/slime/slime-${sizeString}-body.png`),
         2,
         0
      );
      this.bodyRenderPart.shakeAmount = this.createBodyShakeAmount(spitChargeProgress);
      this.attachRenderPart(this.bodyRenderPart);

      // Eye
      this.eyeRenderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/slime/slime-${sizeString}-eye.png`),
         3,
         eyeRotation
      );
      this.eyeRenderPart.offset = Point.fromVectorForm(Slime.EYE_OFFSETS[this.size], eyeRotation);
      this.eyeRenderPart.inheritParentRotation = false;
      this.attachRenderPart(this.eyeRenderPart);

      // Shading
      this.attachRenderPart(new RenderPart(
         this,
         getTextureArrayIndex(`entities/slime/slime-${sizeString}-shading.png`),
         0,
         0
      ));
   }

   public tick(): void {
      super.tick();
      
      for (let i = 0; i < this.orbs.length; i++) {
         const orb = this.orbs[i];

         // Randomly move around the orbs
         if (Math.random() < 0.3 / SETTINGS.TPS) {
            orb.angularVelocity = randFloat(-3, 3);
         }

         // Update orb angular velocity & rotation
         orb.rotation += orb.angularVelocity / SETTINGS.TPS;

         // Update the orb's rotation
         if (orb.angularVelocity !== 0) {
            const spriteSize = Slime.SIZES[this.size];
            const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orb.offset);
            (this.orbRenderParts[i].offset as Point).x = offsetMagnitude * Math.sin(orb.rotation);
            (this.orbRenderParts[i].offset as Point).y = offsetMagnitude * Math.cos(orb.rotation);
         }

         orb.angularVelocity -= 3 / SETTINGS.TPS;
         if (orb.angularVelocity < 0) {
            orb.angularVelocity = 0;
         }
      }
   }

   private createOrb(size: SlimeSize): void {
      const orbInfo: SlimeOrbInfo = {
         size: size,
         rotation: 2 * Math.PI * Math.random(),
         offset: Math.random(),
         angularVelocity: 0
      };
      this.orbs.push(orbInfo);

      const sizeString = Slime.SIZE_STRINGS[size];
      
      // Calculate the orb's offset from the center of the slime
      const spriteSize = Slime.SIZES[this.size];
      const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orbInfo.offset);

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/slime/slime-orb-${sizeString}.png`),
         1,
         orbInfo.rotation
      );
      renderPart.offset = Point.fromVectorForm(offsetMagnitude, orbInfo.rotation);
      this.attachRenderPart(renderPart);
      this.orbRenderParts.push(renderPart);
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

      // Add any new orbs
      const orbSizes = entityData.clientArgs[2];
      for (let i = this.orbs.length; i < orbSizes.length; i++) {
         const size = orbSizes[i];
         this.createOrb(size);
      }

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