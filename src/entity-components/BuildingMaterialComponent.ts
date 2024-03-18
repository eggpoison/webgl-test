import { BuildingMaterial, BuildingMaterialComponentData, EntityType, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { entityIsPlacedOnWall } from "../entities/Spikes";

export const WALL_TEXTURE_SOURCES = ["entities/wall/wooden-wall.png", "entities/wall/stone-wall.png"];
export const DOOR_TEXTURE_SOURCES = ["entities/door/wooden-door.png", "entities/door/stone-door.png"];
export const EMBRASURE_TEXTURE_SOURCES = ["entities/embrasure/wooden-embrasure.png", "entities/embrasure/stone-embrasure.png"];
export const TUNNEL_TEXTURE_SOURCES = ["entities/tunnel/wooden-tunnel.png", "entities/tunnel/stone-tunnel.png"];
export const FLOOR_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-floor-spikes.png", "entities/spikes/stone-floor-spikes.png"];
export const WALL_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-wall-spikes.png", "entities/spikes/stone-wall-spikes.png"];

const getMaterialTextureSources = (entity: Entity): ReadonlyArray<string> => {
   switch (entity.type) {
      case EntityType.wall: return WALL_TEXTURE_SOURCES;
      case EntityType.door: return DOOR_TEXTURE_SOURCES;
      case EntityType.embrasure: return EMBRASURE_TEXTURE_SOURCES;
      case EntityType.tunnel: return TUNNEL_TEXTURE_SOURCES;
      case EntityType.spikes: return entityIsPlacedOnWall(entity) ? WALL_SPIKE_TEXTURE_SOURCES : FLOOR_SPIKE_TEXTURE_SOURCES;
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
         const textureSources = getMaterialTextureSources(this.entity);

         const textureSource = textureSources[data.material];
      this.materialRenderPart.switchTextureSource(textureSource);
      }
      
      this.material = data.material;
   }
}

export default BuildingMaterialComponent;