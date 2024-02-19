import Ballista from "../../../entities/Ballista";
import { getSelectedEntity } from "../../../entity-selection";
import InventoryContainer from "./InventoryContainer";

const AmmoBoxInventory = () => {
   const turret = getSelectedEntity() as Ballista;
   
   return <div className="menu" onContextMenu={(e) => e.nativeEvent.preventDefault()}>
      <h2 className="menu-title">Ammo Box</h2>
      <InventoryContainer entityID={turret.id} inventory={turret.ammoBoxInventory} />
   </div>;
}

export default AmmoBoxInventory;