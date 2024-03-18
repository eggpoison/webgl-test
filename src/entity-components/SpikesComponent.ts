import { ServerComponentType, SpikesComponentData } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class SpikesComponent extends ServerComponent<ServerComponentType.spikes> {
   public readonly attachedWallID: number;

   constructor(entity: Entity, data: SpikesComponentData) {
      super(entity);

      this.attachedWallID = data.attachedWallID;
   }

   public updateFromData(_data: SpikesComponentData): void {}
}

export default SpikesComponent;