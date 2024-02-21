import Barrel from "../../../entities/Barrel";
import InventoryContainer from "./InventoryContainer";
import { getSelectedEntity } from "../../../entity-selection";

const BarrelInventory = () => {
   const barrel = getSelectedEntity() as Barrel;
   
   return <>
      <div id="barrel-inventory" className="menu">
         <h2 className="menu-title">Barrel</h2>
         <InventoryContainer entityID={barrel.id} inventory={barrel.inventory} />
      </div>
      {/* @Incomplete */}
      <div className="menu">
         <h2 className="menu-title">Lock</h2>
         <div className="area">
            <label>
               <input type="checkbox" defaultChecked={true} />
               Allow friendly tribesmen
            </label>
            <label>
               <input type="checkbox" defaultChecked={false} />
               Allow enemies
            </label>
         </div>
      </div>
   </>;
}

export default BarrelInventory;