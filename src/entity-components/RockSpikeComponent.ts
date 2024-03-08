import { RockSpikeProjectileComponentData, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";

class RockSpikeComponent extends ServerComponent<ServerComponentType.rockSpike> {
   public readonly size: number;
   public readonly lifetime: number;

   constructor(entity: GameObject, data: RockSpikeProjectileComponentData) {
      super(entity);

      this.size = data.size;
      this.lifetime = data.lifetime;
   }

   public updateFromData(_data: RockSpikeProjectileComponentData): void {}
}

export default RockSpikeComponent;