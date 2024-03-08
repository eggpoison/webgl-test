import { ServerComponentType, Settings, SlimeComponentData, SlimeSize, lerp, randFloat } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";
import RenderPart from "../render-parts/RenderPart";
import Slime from "../entities/Slime";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

/** Information about an orb inside a slime */
interface SlimeOrbInfo {
   readonly size: SlimeSize;
   /** Offset of the orb from the center of the slime (from 0->1) */
   readonly offset: number;
   rotation: number;
   angularVelocity: number;
}

const getBodyShakeAmount = (spitProgress: number): number => {
   return lerp(0, 5, spitProgress);
}

class SlimeComponent extends ServerComponent<ServerComponentType.slime> {
   private static readonly EYE_OFFSETS: ReadonlyArray<number> = [16, 24, 34];

   private static readonly EYE_SHAKE_START_FREQUENCY = 0.5;
   private static readonly EYE_SHAKE_END_FREQUENCY = 1.25;
   private static readonly EYE_SHAKE_START_AMPLITUDE = 0.07;
   private static readonly EYE_SHAKE_END_AMPLITUDE = 0.2;

   private readonly bodyRenderPart: RenderPart;
   private readonly eyeRenderPart: RenderPart;
   private readonly orbRenderParts = new Array<RenderPart>();

   public readonly size: number;
   private readonly orbs = new Array<SlimeOrbInfo>();

   private internalTickCounter = 0;

   constructor(entity: GameObject, data: SlimeComponentData) {
      super(entity);

      this.size = data.size;
      
      const sizeString = Slime.SIZE_STRINGS[data.size];

      // Body
      this.bodyRenderPart = new RenderPart(
         this.entity,
         getTextureArrayIndex(`entities/slime/slime-${sizeString}-body.png`),
         2,
         0
      );
      this.bodyRenderPart.shakeAmount = getBodyShakeAmount(data.spitChargeProgress);
      this.entity.attachRenderPart(this.bodyRenderPart);

      // Shading
      this.entity.attachRenderPart(new RenderPart(
         this.entity,
         getTextureArrayIndex(`entities/slime/slime-${sizeString}-shading.png`),
         0,
         0
      ));

      // Eye
      const eyeRenderPart = new RenderPart(
         this.entity,
         getTextureArrayIndex(`entities/slime/slime-${sizeString}-eye.png`),
         3,
         data.eyeRotation
      );

      const eyeOffsetAmount = SlimeComponent.EYE_OFFSETS[this.size];
      eyeRenderPart.offset.x = eyeOffsetAmount * Math.sin(data.eyeRotation);
      eyeRenderPart.offset.y = eyeOffsetAmount * Math.cos(data.eyeRotation);
      eyeRenderPart.inheritParentRotation = false;
      this.entity.attachRenderPart(eyeRenderPart);

      this.eyeRenderPart = eyeRenderPart;

      // Create initial orbs
      for (let i = 0; i < data.orbSizes.length; i++) {
         const size = data.orbSizes[i];
         this.createOrb(size);
      }
   }

   public tick(): void {
      for (let i = 0; i < this.orbs.length; i++) {
         const orb = this.orbs[i];

         // Randomly move around the orbs
         if (Math.random() < 0.3 / Settings.TPS) {
            orb.angularVelocity = randFloat(-3, 3);
         }

         // Update orb angular velocity & rotation
         orb.rotation += orb.angularVelocity / Settings.TPS;

         // Update the orb's rotation
         if (orb.angularVelocity !== 0) {
            const spriteSize = Slime.SIZES[this.size];
            const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orb.offset);
            this.orbRenderParts[i].offset.x = offsetMagnitude * Math.sin(orb.rotation);
            this.orbRenderParts[i].offset.y = offsetMagnitude * Math.cos(orb.rotation);
         }

         orb.angularVelocity -= 3 / Settings.TPS;
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
         this.entity,
         getTextureArrayIndex(`entities/slime/slime-orb-${sizeString}.png`),
         1,
         orbInfo.rotation
      );
      renderPart.offset.x = offsetMagnitude * Math.sin(orbInfo.rotation);
      renderPart.offset.y = offsetMagnitude * Math.cos(orbInfo.rotation);
      this.entity.attachRenderPart(renderPart);
      this.orbRenderParts.push(renderPart);
   }

   public updateFromData(data: SlimeComponentData): void {
      // 
      // Update the eye's rotation
      // 

      const anger = data.anger;
      this.eyeRenderPart.rotation = data.eyeRotation;
      if (anger >= 0) {
         const frequency = lerp(SlimeComponent.EYE_SHAKE_START_FREQUENCY, SlimeComponent.EYE_SHAKE_END_FREQUENCY, anger);
         this.internalTickCounter += frequency;

         let amplitude = lerp(SlimeComponent.EYE_SHAKE_START_AMPLITUDE, SlimeComponent.EYE_SHAKE_END_AMPLITUDE, anger) * 100;
         amplitude /= Math.PI * Slime.SIZES[this.size];
         this.eyeRenderPart.rotation += amplitude * Math.sin(this.internalTickCounter * 3);
      } else {
         this.internalTickCounter = 0;
      }

      this.eyeRenderPart.offset.x = SlimeComponent.EYE_OFFSETS[this.size] * Math.sin(this.eyeRenderPart.rotation);
      this.eyeRenderPart.offset.y = SlimeComponent.EYE_OFFSETS[this.size] * Math.cos(this.eyeRenderPart.rotation);

      // Add any new orbs
      for (let i = this.orbs.length; i < data.orbSizes.length; i++) {
         const size = data.orbSizes[i];
         this.createOrb(size);
      }

      if (data.anger === -1) {
         this.bodyRenderPart.shakeAmount = 0;
      } else {
         const spitChargeProgress = data.spitChargeProgress;
         this.bodyRenderPart.shakeAmount = getBodyShakeAmount(spitChargeProgress);
      }
   }
}

export default SlimeComponent;