import { BuildingMaterial, BuildingMaterialComponentData, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class BuildingMaterialComponent extends ServerComponent<ServerComponentType.buildingMaterial> {
   public material: BuildingMaterial;
   
   constructor(entity: Entity, data: BuildingMaterialComponentData) {
      super(entity);

      this.material = data.material;
   }

   public updateFromData(data: BuildingMaterialComponentData): void {
      this.material = data.material;
   }
}

export default BuildingMaterialComponent;