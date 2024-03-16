import { EntityComponentsData, EntityType, Point, ServerComponentType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import HealthComponent from "../entity-components/HealthComponent";
import Entity from "../Entity";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TunnelComponent from "../entity-components/TunnelComponent";
import BuildingMaterialComponent from "../entity-components/BuildingMaterialComponent";

class Tunnel extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tunnel>) {
      super(position, id, EntityType.tunnel, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/tunnel/wooden-tunnel.png"),
            1,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.tunnel, new TunnelComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.buildingMaterial, new BuildingMaterialComponent(this, componentsData[4]));
   }
}

export default Tunnel;