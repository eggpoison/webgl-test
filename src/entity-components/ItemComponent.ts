import { ItemComponentData, ItemType, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";
import { createDeepFrostHeartBloodParticles } from "../items/ItemEntity";

class ItemComponent extends ServerComponent<ServerComponentType.item> {
   public readonly itemType: ItemType;
   
   constructor(entity: GameObject, data: ItemComponentData) {
      super(entity);

      this.itemType = data.itemType;
   }

   public tick(): void {
      // Make the deep frost heart item spew blue blood particles
      if (this.itemType === ItemType.deepfrost_heart) {
         createDeepFrostHeartBloodParticles(this.entity.position.x, this.entity.position.y, 0, 0);
      }
   }
   
   public updateFromData(_data: ItemComponentData): void {}
}

export default ItemComponent;