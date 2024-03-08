import { ArrowComponentData, GenericArrowType, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class ArrowComponent extends ServerComponent<ServerComponentType.arrow> {
   public readonly arrowType: GenericArrowType;

   constructor(entity: Entity, data: ArrowComponentData) {
      super(entity);

      this.arrowType = data.arrowType;
   }

   public updateFromData(_data: ArrowComponentData): void {}
}

export default ArrowComponent;