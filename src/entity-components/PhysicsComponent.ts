import { PhysicsComponentData, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";

class PhysicsComponent extends ServerComponent<ServerComponentType.physics> {
   constructor(entity: GameObject, _data: PhysicsComponentData) {
      super(entity);
   }

   public updateFromData(_data: PhysicsComponentData): void {}
}

export default PhysicsComponent;