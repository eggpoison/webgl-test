import { ArrowComponentData, GenericArrowType, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";

class ArrowComponent extends ServerComponent<ServerComponentType.arrow> {
   public readonly arrowType: GenericArrowType;

   constructor(entity: GameObject, data: ArrowComponentData) {
      super(entity);

      this.arrowType = data.arrowType;
   }

   public updateFromData(_data: ArrowComponentData): void {}
}

export default ArrowComponent;