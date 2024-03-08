import { FishComponentData, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";

class FishComponent extends ServerComponent<ServerComponentType.fish> {
   public readonly waterOpacityMultiplier: number;
   
   constructor(entity: GameObject, waterOpacityMultiplier: number) {
      super(entity);

      this.waterOpacityMultiplier = waterOpacityMultiplier;
   }

   public updateFromData(_data: FishComponentData): void {}
}

export default FishComponent;