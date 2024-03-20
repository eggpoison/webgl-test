import { BlueprintType, BlueprintComponentData, ServerComponentType, randFloat, assertUnreachable } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import RenderPart from "../render-parts/RenderPart";
import Entity from "../Entity";
import { playSound } from "../sound";
import { createLightWoodSpeckParticle, createRockParticle, createRockSpeckParticle, createSawdustCloud, createWoodShardParticle } from "../particles";

const createWoodenBlueprintWorkParticleEffects = (entity: Entity): void => {
   for (let i = 0; i < 2; i++) {
      createWoodShardParticle(entity.position.x, entity.position.y, 24);
   }

   for (let i = 0; i < 3; i++) {
      createLightWoodSpeckParticle(entity.position.x, entity.position.y, 24 * Math.random());
   }

   for (let i = 0; i < 2; i++) {
      const x = entity.position.x + randFloat(-24, 24);
      const y = entity.position.y + randFloat(-24, 24);
      createSawdustCloud(x, y);
   }
}
/*
make them render on high position
make the origin point for the offset be based on the partial render part (random point in the partial render part)
*/




const createStoneBlueprintWorkParticleEffects = (entity: Entity): void => {
   for (let i = 0; i < 3; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetAmount = 24 * Math.random();
      createRockParticle(entity.position.x + offsetAmount * Math.sin(offsetDirection), entity.position.y + offsetAmount * Math.cos(offsetDirection), 2 * Math.PI * Math.random(), randFloat(50, 70));
   }

   for (let i = 0; i < 3; i++) {
      createRockSpeckParticle(entity.position.x, entity.position.y, 24 * Math.random(), 0, 0);
   }
}

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
         
         // @Incomplete: Create the particle effects at the positoin of the partial texture
         // @Incomplete: Change the particle effect type depending on the material of the worked-on partial texture
         // Create particle effects
         switch (this.blueprintType) {
            case BlueprintType.woodenDoor:
            case BlueprintType.woodenEmbrasure:
            case BlueprintType.woodenTunnel:
            case BlueprintType.slingTurret:
            case BlueprintType.ballista: {
               createWoodenBlueprintWorkParticleEffects(this.entity);
               break;
            }
            case BlueprintType.stoneDoorUpgrade:
            case BlueprintType.stoneEmbrasure:
            case BlueprintType.stoneEmbrasureUpgrade:
            case BlueprintType.stoneFloorSpikes:
            case BlueprintType.stoneTunnel:
            case BlueprintType.stoneTunnelUpgrade:
            case BlueprintType.stoneWallSpikes:
            case BlueprintType.stoneWall:
            case BlueprintType.stoneDoor: {
               createStoneBlueprintWorkParticleEffects(this.entity);
               break;
            }
            default: {
               assertUnreachable(this.blueprintType);
               break;
            }
         }
      }
      this.lastBlueprintProgress = blueprintProgress;
   }
}

export default BlueprintComponent;