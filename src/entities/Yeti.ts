import { EntityType, Point, Vector, EntityData, lerp, HitData } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createBloodParticle } from "../generic-particles";

class Yeti extends Entity {
   private static readonly SIZE = 128;

   private static readonly PAW_SIZE = 28;

   private static readonly PAW_START_ANGLE = Math.PI/3;
   private static readonly PAW_END_ANGLE = Math.PI/6;

   public type: EntityType = "yeti";

   private attackProgress = 1;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, attackProgress: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            Yeti.SIZE,
            Yeti.SIZE,
            "entities/yeti.png",
            1,
            0
         )
      );

      for (let i = 0; i < 2; i++) {
         this.createPaw(i);
      }

      this.attackProgress = attackProgress;
   }
   
   private createPaw(i: number): void {
      const paw = new RenderPart(
         Yeti.PAW_SIZE,
         Yeti.PAW_SIZE,
         "entities/yeti-paw.png",
         0,
         0
      );
      paw.offset = () => {
         let attackProgress = this.attackProgress;
         attackProgress = Math.pow(attackProgress, 0.75);
         const angle = lerp(Yeti.PAW_END_ANGLE, Yeti.PAW_START_ANGLE, attackProgress) * (i === 0 ? 1 : -1);
         const offset = new Vector(Yeti.SIZE/2, angle).convertToPoint();
         return offset;
      }
      this.attachRenderPart(paw);
   }

   public updateFromData(entityData: EntityData<"yeti">): void {
      super.updateFromData(entityData);

      this.attackProgress = entityData.clientArgs[0];
   }

   protected onHit(hitData: HitData): void {
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            createBloodParticle(this.position, hitData.angleFromAttacker, Yeti.SIZE / 2);
         }
      }
   }
}

export default Yeti;