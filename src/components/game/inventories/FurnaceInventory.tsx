import Entity from "../../../entities/Entity"
import Furnace from "../../../entities/Furnace";
import InventoryContainer from "./InventoryContainer";

interface FurnaceInventoryProps {
   readonly entity: Entity;
}

function assertEntityIsFurnace(entity: Entity): asserts entity is Furnace {
   if (entity.type !== "furnace") {
      throw new Error("Entity passed into FurnaceInventory wasn't a furnace.");
   }
}

const FurnaceInventory = (props: FurnaceInventoryProps) => {
   assertEntityIsFurnace(props.entity);
   
   return <div id="furnace-inventory" className="heating-inventory inventory">
      <InventoryContainer className="fuel-inventory" entityID={props.entity.id} inventory={props.entity.fuelInventory} />
      <InventoryContainer className="ingredient-inventory" entityID={props.entity.id} inventory={props.entity.ingredientInventory} />
      <InventoryContainer className="output-inventory" entityID={props.entity.id} inventory={props.entity.outputInventory} />
   </div>;
}

export default FurnaceInventory;