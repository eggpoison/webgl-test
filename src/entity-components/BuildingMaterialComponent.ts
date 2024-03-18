import { BuildingMaterial, BuildingMaterialComponentData, EntityType, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";

export const WALL_TEXTURE_SOURCES = ["entities/wall/wooden-wall.png", "entities/wall/stone-wall.png"]
export const DOOR_TEXTURE_SOURCES = ["entities/door/wooden-door.png", "entities/door/stone-door.png"]
export const EMBRASURE_TEXTURE_SOURCES = ["entities/embrasure/wooden-embrasure.png", "entities/embrasure/stone-embrasure.png"]
export const TUNNEL_TEXTURE_SOURCES = ["entities/tunnel/wooden-tunnel.png", "entities/tunnel/stone-tunnel.png"]
export const SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-floor-spikes.png", "entities/spikes/stone-floor-spikes.png"]

const getMaterialTextureSources = (entityType: EntityType): ReadonlyArray<string> => {
   switch (entityType) {
      case EntityType.wall: return WALL_TEXTURE_SOURCES;
      case EntityType.door: return DOOR_TEXTURE_SOURCES;
      case EntityType.embrasure: return EMBRASURE_TEXTURE_SOURCES;
      case EntityType.tunnel: return TUNNEL_TEXTURE_SOURCES;
      case EntityType.spikes: return SPIKE_TEXTURE_SOURCES;
      default: {
         throw new Error();
      }
   }
}

class BuildingMaterialComponent extends ServerComponent<ServerComponentType.buildingMaterial> {
   private readonly materialRenderPart: RenderPart;
   public material: BuildingMaterial;
   
   constructor(entity: Entity, data: BuildingMaterialComponentData, materialRenderPart: RenderPart) {
      super(entity);

      this.material = data.material;
      this.materialRenderPart = materialRenderPart;
   }

   public updateFromData(data: BuildingMaterialComponentData): void {
      if (data.material !== this.material) {
         const textureSources = getMaterialTextureSources(this.entity.type);

         const textureSource = textureSources[data.material];
      this.materialRenderPart.switchTextureSource(textureSource);
      }
      
      this.material = data.material;
   }
}

export default BuildingMaterialComponent;