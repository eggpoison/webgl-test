import { EntityType, Point, HitboxType, Vector, EntityData, lerp } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class Yeti extends Entity {
   private static readonly SIZE = 128;

   private static readonly PAW_SIZE = 28;

   private static readonly PAW_START_ANGLE = Math.PI/3;
   private static readonly PAW_END_ANGLE = Math.PI/6;

   public type: EntityType = "yeti";

   private attackProgress = 1;

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, attackProgress: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderPart(
         new RenderPart({
            width: Yeti.SIZE,
            height: Yeti.SIZE,
            textureSource: "entities/yeti.png",
            zIndex: 0
         }, this)
      );

      for (let i = 0; i < 2; i++) {
         this.createPaw(i);
      }

      this.attackProgress = attackProgress;
   }
   
   private createPaw(i: number): void {
      this.attachRenderPart(
         new RenderPart({
            width: Yeti.PAW_SIZE,
            height: Yeti.PAW_SIZE,
            textureSource: "entities/yeti-paw.png",
            zIndex: 0,
            offset: () => {
               const angle = lerp(Yeti.PAW_END_ANGLE, Yeti.PAW_START_ANGLE, this.attackProgress) * (i === 0 ? 1 : -1);
               const offset = new Vector(Yeti.SIZE/2, angle).convertToPoint();
               return offset;
            }
         }, this)
      );
   }

   public updateFromData(entityData: EntityData<"yeti">): void {
      super.updateFromData(entityData);

      this.attackProgress = entityData.clientArgs[0];
   }
}

export default Yeti;