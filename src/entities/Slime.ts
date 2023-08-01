import { EntityData, EntityType, HitboxType, Point, SlimeSize, Vector } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Slime extends Entity {
   private static readonly SIZES: ReadonlyArray<number> = [
      64, // small
      88, // medium
      120 // large
   ];
   private static readonly SIZE_STRINGS: ReadonlyArray<string> = ["small", "medium", "large"];

   public type: EntityType = "slime";

   private eyeRotation: number = 0;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, size: SlimeSize) {
      super(position, hitboxes, id, secondsSinceLastHit);

      const a = 2 * Math.PI * Math.random();
      const b = 2 * Math.PI * Math.random();

      const c = 2 * Math.PI * Math.random();
      const d = 2 * Math.PI * Math.random();

      const spriteSize = Slime.SIZES[size];

      const sizeString = Slime.SIZE_STRINGS[size];

      this.attachRenderParts([
         new RenderPart({
            width: spriteSize,
            height: spriteSize,
            textureSource: `entities/slime/slime-${sizeString}-body.png`,
            zIndex: 2
         }, this),
         new RenderPart({
            width: spriteSize,
            height: spriteSize,
            textureSource: `entities/slime/slime-${sizeString}-eye.png`,
            zIndex: 3,
            inheritParentRotation: false,
            getRotation: () => this.eyeRotation
         }, this),
         new RenderPart({
            width: spriteSize,
            height: spriteSize,
            textureSource: `entities/slime/slime-${sizeString}-shading.png`,
            zIndex: 0
         }, this),
         new RenderPart({
            width: 16,
            height: 16,
            textureSource: `entities/slime/slime-orb-small.png`,
            zIndex: 1,
            offset: () => new Vector(spriteSize / 4, a).convertToPoint(),
            getRotation: () => c
         }, this),
         new RenderPart({
            width: 20,
            height: 20,
            textureSource: `entities/slime/slime-orb-medium.png`,
            zIndex: 1,
            offset: () => new Vector(spriteSize / 4 - 3, b).convertToPoint(),
            getRotation: () => d
         }, this)
      ]);
   }

   public updateFromData(entityData: EntityData<"slime">): void {
      super.updateFromData(entityData);
      
      this.eyeRotation = entityData.clientArgs[1];
   }
}

export default Slime;