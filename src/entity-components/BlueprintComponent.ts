import { BlueprintType, BlueprintComponentData, ServerComponentType, randFloat } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import RenderPart from "../render-parts/RenderPart";
import Entity from "../Entity";
import { playSound } from "../sound";
import { createLightWoodSpeckParticle, createSawdustCloud, createWoodShardParticle } from "../particles";

class BlueprintComponent extends ServerComponent<ServerComponentType.blueprint> {
   public readonly partialRenderParts = new Array<RenderPart>();
   
   public readonly blueprintType: BlueprintType;
   public lastBlueprintProgress: number;
   public readonly associatedEntityID: number;

   constructor(entity: Entity, data: BlueprintComponentData) {
      super(entity);

      this.blueprintType = data.blueprintType;
      this.lastBlueprintProgress = data.buildProgress;
      this.associatedEntityID = data.associatedEntityID;
   }

   public updateFromData(data: BlueprintComponentData): void {
      const blueprintProgress = data.buildProgress;

      if (blueprintProgress !== this.lastBlueprintProgress) {
         playSound("blueprint-work.mp3", 0.4, randFloat(0.9, 1.1), this.entity.position.x, this.entity.position.y);
         
         for (let i = 0; i < 2; i++) {
            createWoodShardParticle(this.entity.position.x, this.entity.position.y, 24);
         }

         for (let i = 0; i < 3; i++) {
            createLightWoodSpeckParticle(this.entity.position.x, this.entity.position.y, 24 * Math.random());
         }

         for (let i = 0; i < 2; i++) {
            const x = this.entity.position.x + randFloat(-24, 24);
            const y = this.entity.position.y + randFloat(-24, 24);
            createSawdustCloud(x, y);
         }
      }
      this.lastBlueprintProgress = blueprintProgress;
   }
}

export default BlueprintComponent;