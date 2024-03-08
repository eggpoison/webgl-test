import { ServerComponentType, SnowballComponentData, SnowballSize } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";

class SnowballComponent extends ServerComponent<ServerComponentType.snowball> {
   public readonly size: SnowballSize;
   
   constructor(entity: GameObject, data: SnowballComponentData) {
      super(entity);

      this.size = data.size;
   }
   
   public updateFromData(_data: SnowballComponentData): void {}
}

export default SnowballComponent;