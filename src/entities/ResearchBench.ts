import { ServerComponentType, EntityComponentsData, EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import ResearchBenchComponent from "../entity-components/ResearchBenchComponent";
import TribeComponent from "../entity-components/TribeComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import HealthComponent from "../entity-components/HealthComponent";
import Entity from "../Entity";

class ResearchBench extends Entity {
   public static readonly WIDTH = 32 * 4;
   public static readonly HEIGHT = 20 * 4;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.researchBench>) {
      super(position, id, EntityType.researchBench, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/research-bench/research-bench.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.researchBench, new ResearchBenchComponent(this, componentsData[3]));
   }
}

export default ResearchBench;