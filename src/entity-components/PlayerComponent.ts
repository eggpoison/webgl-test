import { PlayerComponentData, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";

class PlayerComponent extends ServerComponent<ServerComponentType.player> {
   public readonly username: string;
   
   constructor(entity: GameObject, data: PlayerComponentData) {
      super(entity);

      this.username = data.username;
   }
   
   public updateFromData(_data: PlayerComponentData): void {}
}

export default PlayerComponent;