import Entity from "../../../entities/Entity"
import Tribesman from "../../../entities/Tribesman";
import InventoryContainer from "./InventoryContainer";

interface TribesmanInventoryProps {
   readonly entity: Entity;
}

function assertEntityIsTribesman(entity: Entity): asserts entity is Tribesman {
   if (entity.type !== "tribesman") {
      throw new Error("Entity passed into TribesmanInventory wasn't a tribesman.");
   }
}

const TribesmanInventory = (props: TribesmanInventoryProps) => {
   assertEntityIsTribesman(props.entity);
   
   return <div id="tribesman-inventory" className="inventory">
      <InventoryContainer entityID={props.entity.id} inventory={props.entity.inventory} />
   </div>;
}

export default TribesmanInventory;