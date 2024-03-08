import { ServerComponentType, ZombieComponentData } from "webgl-test-shared";
import GameObject from "../GameObject";
import ServerComponent from "./ServerComponent";

class ZombieComponent extends ServerComponent<ServerComponentType.zombie> {
   public readonly zombieType: number;
   
   constructor(entity: GameObject, data: ZombieComponentData) {
      super(entity);

      this.zombieType = data.zombieType;
   }

   public updateFromData(_data: ZombieComponentData): void {}
}

export default ZombieComponent;