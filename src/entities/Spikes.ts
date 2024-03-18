import { EntityComponentsData, EntityType, Point, ServerComponentType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import BuildingMaterialComponent, { FLOOR_SPIKE_TEXTURE_SOURCES, WALL_SPIKE_TEXTURE_SOURCES } from "../entity-components/BuildingMaterialComponent";
import SpikesComponent from "../entity-components/SpikesComponent";
import TribeComponent from "../entity-components/TribeComponent";

export function entityIsPlacedOnWall(entity: Entity): boolean {
   if (entity.hasServerComponent(ServerComponentType.spikes)) {
      const spikesComponent = entity.getServerComponent(ServerComponentType.spikes);
      return spikesComponent.attachedWallID !== 0;
   }
   return false;
}

class Spikes extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.spikes>) {
      super(position, id, EntityType.spikes, ageTicks);

      const spikesComponentData = componentsData[3];
      const materialComponentData = componentsData[4];

      let textureArrayIndex: number;
      if (spikesComponentData.attachedWallID !== 0) {
         textureArrayIndex = getTextureArrayIndex(WALL_SPIKE_TEXTURE_SOURCES[materialComponentData.material]);
      } else {
         textureArrayIndex = getTextureArrayIndex(FLOOR_SPIKE_TEXTURE_SOURCES[materialComponentData.material]);
      }

      const mainRenderPart = new RenderPart(
         this,
         textureArrayIndex,
         0,
         0
      )
      this.attachRenderPart(mainRenderPart);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.spikes, new SpikesComponent(this, spikesComponentData));
      this.addServerComponent(ServerComponentType.buildingMaterial, new BuildingMaterialComponent(this, materialComponentData, mainRenderPart));
      
      if (ageTicks === 0) {
         playSound("spike-place.mp3", 0.5, 1, this.position.x, this.position.y);
      }
   }

   protected onHit(): void {
      playSound("wooden-spikes-hit.mp3", 0.2, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Spikes;