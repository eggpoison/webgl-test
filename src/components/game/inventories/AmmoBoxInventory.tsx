import Ballista from "../../../entities/Ballista";
import { getSelectedEntity } from "../../../entity-selection";
import InventoryContainer from "./InventoryContainer";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import { AMMO_INFO_RECORD, BallistaAmmoType, ItemType } from "webgl-test-shared";

const getAmmoSlot = (ballista: Ballista): number => {
   for (let itemSlot = 1; itemSlot <= ballista.ammoBoxInventory.width * ballista.ammoBoxInventory.height; itemSlot++) {
      if (ballista.ammoBoxInventory.itemSlots.hasOwnProperty(itemSlot)) {
         return itemSlot;
      }
   }

   return -1;
}

const AMMO_BG_COLOURS: Record<BallistaAmmoType, string> = {
   [ItemType.wood]: "#8f5a21",
   [ItemType.rock]: "#ccc",
   [ItemType.slimeball]: "#9efa69",
   [ItemType.frostcicle]: "#7ac6f5"
}

interface RemainingAmmoSliderProps {
   readonly ammoType: BallistaAmmoType | null;
   readonly ammoRemaining: number;
}

const RemainingAmmoSlider = (props: RemainingAmmoSliderProps) => {
   const sliderProgress = props.ammoType !== null ? props.ammoRemaining / AMMO_INFO_RECORD[props.ammoType].ammoMultiplier : 0;
   
   return <div className="ammo-slider-container">
      <div className="ammo-slider" style={{"width": (sliderProgress * 100) + "%", "backgroundColor": props.ammoType !== null ? AMMO_BG_COLOURS[props.ammoType] : "#000"}}>
         {props.ammoType !== null ? (
            <span className="label">{props.ammoRemaining}/{AMMO_INFO_RECORD[props.ammoType].ammoMultiplier}</span>
         ) : undefined}
      </div>
   </div>;
}

const AmmoBoxInventory = () => {
   const ballista = getSelectedEntity() as Ballista;
   const nextAmmoSlot = getAmmoSlot(ballista);
   
   return <div className="menu" onContextMenu={(e) => e.nativeEvent.preventDefault()}>
      <h2 className="menu-title">Ammo Box</h2>
      <div className="area-row">
      <div className="area">
         <p>Bolt type: {ballista.ammoRemaining > 0 ? CLIENT_ITEM_INFO_RECORD[ballista.ammoType!].name : "None"}</p>
         <RemainingAmmoSlider ammoType={ballista.ammoType} ammoRemaining={ballista.ammoRemaining} />
      </div>
      <div className="area">
         <label>
            <input type="checkbox" defaultChecked={false} />
            Hold Fire
         </label>
      </div>
      </div>
      <InventoryContainer entityID={ballista.id} inventory={ballista.ammoBoxInventory} selectedItemSlot={nextAmmoSlot !== -1 ? nextAmmoSlot : undefined} />
   </div>;
}

export default AmmoBoxInventory;