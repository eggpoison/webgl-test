import Barrel from "../../../entities/Barrel";
import InventoryContainer from "./InventoryContainer";
import { getSelectedEntity } from "../../../entity-selection";

const BarrelInventory = () => {
   const barrel = getSelectedEntity() as Barrel;
   
   return <div id="barrel-inventory" className="inventory">
      <InventoryContainer entityID={barrel.id} inventory={barrel.inventory} />
   </div>;
}

export default BarrelInventory;