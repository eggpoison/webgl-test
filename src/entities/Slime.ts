import { EntityData, EntityType, HitboxType, Point, Vector } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Slime extends Entity {
   private static readonly WIDTH = 88;
   private static readonly HEIGHT = 88;

   public type: EntityType = "slime";

   private eyeRotation: number = 0;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      const a = 2 * Math.PI * Math.random();
      const b = 2 * Math.PI * Math.random();

      const c = 2 * Math.PI * Math.random();
      const d = 2 * Math.PI * Math.random();

      this.attachRenderParts([
         new RenderPart({
            width: Slime.WIDTH,
            height: Slime.HEIGHT,
            textureSource: `entities/slime/slime-medium-body.png`,
            zIndex: 2
         }, this),
         new RenderPart({
            width: Slime.WIDTH,
            height: Slime.HEIGHT,
            textureSource: `entities/slime/slime-medium-eye.png`,
            zIndex: 3,
            inheritParentRotation: false,
            getRotation: () => this.eyeRotation
         }, this),
         new RenderPart({
            width: Slime.WIDTH,
            height: Slime.HEIGHT,
            textureSource: `entities/slime/slime-medium-shading1.png`,
            zIndex: 0
         }, this),
         new RenderPart({
            width: 16,
            height: 16,
            textureSource: `entities/slime/slime-orb-small.png`,
            zIndex: 1,
            offset: () => new Vector(25, a).convertToPoint(),
            getRotation: () => c
         }, this),
         new RenderPart({
            width: 20,
            height: 20,
            textureSource: `entities/slime/slime-orb-medium.png`,
            zIndex: 1,
            offset: () => new Vector(22, b).convertToPoint(),
            getRotation: () => d
         }, this)
      ]);
   }

   public updateFromData(entityData: EntityData<"slime">): void {
      super.updateFromData(entityData);
      
      this.eyeRotation = entityData.clientArgs[0];
   }
}

export default Slime;