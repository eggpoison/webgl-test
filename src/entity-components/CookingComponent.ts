import { CookingComponentData, ServerComponentType, randFloat } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Board, { Light } from "../Board";
import GameObject from "../GameObject";

class CookingComponent extends ServerComponent<ServerComponentType.cooking> {
   public heatingProgress: number;
   public isCooking: boolean

   // @Cleanup: Instead of doing this, just attach the light to the entity (and make the attach system destroy the light when the entity is removed)
   private readonly light: Light;

   constructor(entity: GameObject, data: CookingComponentData) {
      super(entity);

      this.heatingProgress = data.heatingProgress;
      this.isCooking = data.isCooking;

      this.light = {
         position: this.entity.position,
         intensity: 1,
         strength: 3.5,
         radius: 40,
         r: 0,
         g: 0,
         b: 0
      };
      Board.lights.push(this.light);
   }

   public tick(): void {
      if (Board.tickIntervalHasPassed(0.15)) {
         this.light.radius = 40 + randFloat(-7, 7);
      }
   }
   
   public updateFromData(data: CookingComponentData): void {
      this.heatingProgress = data.heatingProgress;
      this.isCooking = data.isCooking;
   }

   public onRemove(): void {
      const idx = Board.lights.indexOf(this.light);
      if (idx !== -1) {
         Board.lights.splice(idx, 1);
      }
   }
}

export default CookingComponent;