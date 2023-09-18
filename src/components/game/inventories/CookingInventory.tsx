import CookingEntity from "../../../entities/CookingEntity";
import Entity from "../../../entities/Entity"
import InventoryContainer from "./InventoryContainer";

interface CookingInventoryProps {
   readonly entity: Entity;
}

function assertEntityIsCookingEntity(entity: Entity): asserts entity is CookingEntity {
   if (entity.type !== "campfire" && entity.type !== "furnace") {
      throw new Error("Entity passed into CampfireInventory wasn't a campfire.");
   }
}

const CookingInventory = (props: CookingInventoryProps) => {
   assertEntityIsCookingEntity(props.entity);
   
   return <div id="campfire-inventory" className="heating-inventory inventory">
      <InventoryContainer className="fuel-inventory" entityID={props.entity.id} inventory={props.entity.fuelInventory} />
      <InventoryContainer className="ingredient-inventory" entityID={props.entity.id} inventory={props.entity.ingredientInventory} />
      <InventoryContainer className="output-inventory" entityID={props.entity.id} inventory={props.entity.outputInventory} />
   </div>;
}

export default CookingInventory;