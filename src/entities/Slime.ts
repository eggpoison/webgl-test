import { EntityData, EntityType, Point, SlimeOrbData, SlimeSize, Vector, lerp } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

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

   public type: EntityType = "slime";

   private eyeRotation: number = 0;

   private readonly size: number;

   private numOrbs: number;
   private readonly orbRotations = new Array<number>();

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, size: SlimeSize, _eyeRotation: number, orbs: ReadonlyArray<SlimeOrbData>) {
      super(position, hitboxes, id);

      const spriteSize = Slime.SIZES[size];

      const sizeString = Slime.SIZE_STRINGS[size];

      this.attachRenderParts([
         // Body
         new RenderPart({
            width: spriteSize,
            height: spriteSize,
            textureSource: `entities/slime/slime-${sizeString}-body.png`,
            zIndex: 2
         }),
         // Eye
         new RenderPart({
            width: spriteSize,
            height: spriteSize,
            textureSource: `entities/slime/slime-${sizeString}-eye.png`,
            zIndex: 3,
            inheritParentRotation: false,
            getRotation: () => this.eyeRotation
         }),
         // Shading
         new RenderPart({
            width: spriteSize,
            height: spriteSize,
            textureSource: `entities/slime/slime-${sizeString}-shading.png`,
            zIndex: 0
         })
      ]);

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

      const renderPart = new RenderPart({
         width: orbSize,
         height: orbSize,
         textureSource: `entities/slime/slime-orb-${sizeString}.png`,
         zIndex: 1,
         offset: () => new Vector(offsetMagnitude, this.orbRotations[i]).convertToPoint(),
         getRotation: () => orbData.rotation
      });
      
      this.attachRenderPart(renderPart);
   }

   public updateFromData(entityData: EntityData<"slime">): void {
      super.updateFromData(entityData);
      
      this.eyeRotation = entityData.clientArgs[1];

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
}

export default Slime;