import { EntityData, EntityType, Point, SlimeOrbData, SlimeSize, lerp } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../generic-particles";

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

   private static readonly NUM_PUDDLE_PARTICLES_ON_HIT: ReadonlyArray<number> = [1, 2, 3];
   private static readonly NUM_PUDDLE_PARTICLES_ON_DEATH: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_HIT: ReadonlyArray<number> = [3, 5, 7];
   private static readonly NUM_SPECK_PARTICLES_ON_DEATH: ReadonlyArray<number> = [6, 10, 15];

   public type: EntityType = "slime";

   private readonly eyeRenderPart: RenderPart;

   private readonly size: number;

   private numOrbs: number;
   private readonly orbRotations = new Array<number>();

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, size: SlimeSize, eyeRotation: number, orbs: ReadonlyArray<SlimeOrbData>) {
      super(position, hitboxes, id);

      const spriteSize = Slime.SIZES[size];

      const sizeString = Slime.SIZE_STRINGS[size];

      // Body
      this.attachRenderPart(
         new RenderPart(
            spriteSize,
            spriteSize,
            `entities/slime/slime-${sizeString}-body.png`,
            2,
            0
         )
      );

      // Eye
      this.eyeRenderPart = new RenderPart(
         spriteSize,
         spriteSize,
         `entities/slime/slime-${sizeString}-eye.png`,
         3,
         eyeRotation
      );
      this.eyeRenderPart.inheritParentRotation = false;
      this.attachRenderPart(this.eyeRenderPart);

      // Shading
      this.attachRenderPart(
         new RenderPart(
            spriteSize,
            spriteSize,
            `entities/slime/slime-${sizeString}-shading.png`,
            0,
            0
         )
      );

      this.size = size;

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

      const renderPart = new RenderPart(
         orbSize,
         orbSize,
         `entities/slime/slime-orb-${sizeString}.png`,
         1,
         orbData.rotation
      );
      renderPart.offset = Point.fromVectorForm(offsetMagnitude, this.orbRotations[i]);
      this.attachRenderPart(renderPart);
   }

   protected overrideTileMoveSpeedMultiplier(): number | null {
      // Slimes move at normal speed on slime blocks
      if (this.tile.type === "slime") {
         return 1;
      }
      return null;
   }

   public updateFromData(entityData: EntityData<"slime">): void {
      super.updateFromData(entityData);
      
      // Update eye's rotation
      this.eyeRenderPart.rotation = entityData.clientArgs[1];

      for (let i = 0; i < entityData.clientArgs[2].length; i++) {
         const orb = entityData.clientArgs[2][i];
         if (i > this.numOrbs) {
            this.createOrbRenderPart(orb, i);
         } else {
            this.orbRotations[i] = orb.rotation;
         }
      }

      this.numOrbs = entityData.clientArgs[2].length;
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
}

export default Slime;