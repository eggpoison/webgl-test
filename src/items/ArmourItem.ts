import Item from "./Item";

class ArmourItem extends Item {
   public onRightMouseButtonDown(): void {
      super.sendUsePacket();
   }
}

export default ArmourItem;