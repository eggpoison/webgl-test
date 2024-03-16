import { EntityComponentsData, EntityType, Point, ServerComponentType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import HealthComponent from "../entity-components/HealthComponent";
import Entity from "../Entity";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TunnelComponent from "../entity-components/TunnelComponent";

class WoodenTunnel extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.woodenTunnel>) {
      super(position, id, EntityType.woodenTunnel, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/wooden-tunnel/wooden-tunnel.png"),
            1,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.tunnel, new TunnelComponent(this, componentsData[3]));
   }
}

export default WoodenTunnel;