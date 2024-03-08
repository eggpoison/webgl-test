import { ServerComponentType, TreeComponentData, TreeSize } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";

class TreeComponent extends ServerComponent<ServerComponentType.tree> {
   public readonly treeSize: TreeSize;
   
   constructor(entity: GameObject, data: TreeComponentData) {
      super(entity);

      this.treeSize = data.treeSize;
   }
   
   public updateFromData(_data: TreeComponentData): void {}
}

export default TreeComponent;