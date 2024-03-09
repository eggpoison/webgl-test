import Ballista from "../../../entities/Ballista";
import { getSelectedEntity } from "../../../entity-selection";
import InventoryContainer from "./InventoryContainer";
import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../client-item-info";
import { AMMO_INFO_RECORD, BallistaAmmoType, Inventory, ItemType, ServerComponentType, Settings } from "webgl-test-shared";
import { CLIENT_STATUS_EFFECT_INFO_RECORD } from "../../../status-effects";

const getAmmoSlot = (ammoBoxInventory: Inventory): number => {
   for (let itemSlot = 1; itemSlot <= ammoBoxInventory.width * ammoBoxInventory.height; itemSlot++) {
      if (ammoBoxInventory.itemSlots.hasOwnProperty(itemSlot)) {
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
   
   const inventoryComponent = ballista.getServerComponent(ServerComponentType.inventory);
   const inventory = inventoryComponent.getInventory("ammoBoxInventory");
   
   const nextAmmoSlot = getAmmoSlot(inventory);
   const ammoBoxComponent = ballista.getServerComponent(ServerComponentType.ammoBox);
   
   return <>
      <div id="ammo-box-menu" className="menu" onContextMenu={(e) => e.nativeEvent.preventDefault()}>
         <h2 className="menu-title">Ammo Box</h2>
         <div className="area-row">
            <div className="area">
               <p>Bolt type: {ammoBoxComponent.ammoRemaining > 0 ? CLIENT_ITEM_INFO_RECORD[ammoBoxComponent.ammoType!].name : "None"}</p>
               <RemainingAmmoSlider ammoType={ammoBoxComponent.ammoType} ammoRemaining={ammoBoxComponent.ammoRemaining} />
            </div>
            <div className="area">
               <label>
                  <input type="checkbox" defaultChecked={false} />
                  Hold Fire
               </label>
            </div>
         </div>
         <InventoryContainer entityID={ballista.id} inventory={inventory} selectedItemSlot={nextAmmoSlot !== -1 ? nextAmmoSlot : undefined} />
      </div>
      <div id="ammo-guide" className="menu">
         <h2 className="menu-title">Ammo Guide</h2>
         {Object.entries(AMMO_INFO_RECORD).map(([itemTypeString, ammoInfo], i) => {
            const itemType: ItemType = Number(itemTypeString);
            const clientItemInfo = CLIENT_ITEM_INFO_RECORD[itemType];
            
            let classname = "area";
            if (ammoBoxComponent.ammoRemaining > 0) {
               if (itemType === ammoBoxComponent.ammoType) {
                  classname += " selected";
               } else {
                  classname += " deselected";
               }
            }
            return <div key={i} className={classname}>
               <h3><img src={getItemTypeImage(itemType)} alt="" />{clientItemInfo.name}</h3>
               <p><span>{ammoInfo.damage}</span> damage</p>
               <p><span>{ammoInfo.ammoMultiplier}x</span> ammo multiplier</p>
               <p><span>{(ammoInfo.shotCooldownTicks + ammoInfo.reloadTimeTicks) / Settings.TPS}s</span> reload time</p>
               {ammoInfo.statusEffect !== null ? (
                  <p><i>Inflicts <span>{ammoInfo.statusEffect.durationTicks / Settings.TPS}s</span> of <span style={{"color": CLIENT_STATUS_EFFECT_INFO_RECORD[ammoInfo.statusEffect.type].colour}}>{CLIENT_STATUS_EFFECT_INFO_RECORD[ammoInfo.statusEffect.type].name}</span>.</i></p>
               ) : undefined}
            </div>
         })}
      </div>
   </>;
}

export default AmmoBoxInventory;