import Campfire from "../../../entities/Campfire";
import Entity from "../../../entities/Entity"
import InventoryContainer from "./InventoryContainer";

interface CampfireInventoryProps {
   readonly entity: Entity;
}

function assertEntityIsCampfire(entity: Entity): asserts entity is Campfire {
   if (entity.type !== "campfire") {
      throw new Error("Entity passed into CampfireInventory wasn't a campfire.");
   }
}

const CampfireInventory = (props: CampfireInventoryProps) => {
   assertEntityIsCampfire(props.entity);
   
   return <div id="campfire-inventory" className="heating-inventory inventory">
      <InventoryContainer className="fuel-inventory" entityID={props.entity.id} inventory={props.entity.fuelInventory} />
      <InventoryContainer className="ingredient-inventory" entityID={props.entity.id} inventory={props.entity.ingredientInventory} />
      <InventoryContainer className="output-inventory" entityID={props.entity.id} inventory={props.entity.outputInventory} />
   </div>;
}

export default CampfireInventory;