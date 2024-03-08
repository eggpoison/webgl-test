import { EntityComponentsData, EntityType, Point, ServerComponentType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import HealthComponent from "../entity-components/HealthComponent";
import GameObject from "../GameObject";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";

class WoodenTunnel extends GameObject {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.woodenTunnel>) {
      super(position, id, EntityType.woodenTunnel, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/wooden-tunnel/wooden-tunnel.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
   }
}

export default WoodenTunnel;