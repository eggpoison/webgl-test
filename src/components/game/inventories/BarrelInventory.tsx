import { EntityType } from "webgl-test-shared";
import Barrel from "../../../entities/Barrel";
import Entity from "../../../entities/Entity"
import InventoryContainer from "./InventoryContainer";

interface BarrelInventoryProps {
   readonly entity: Entity;
}

function assertEntityIsBarrel(entity: Entity): asserts entity is Barrel {
   if (entity.type !== EntityType.barrel) {
      throw new Error("Entity passed into BarrelInventory wasn't a barrel.");
   }
}

const BarrelInventory = (props: BarrelInventoryProps) => {
   assertEntityIsBarrel(props.entity);
   
   return <div id="barrel-inventory" className="inventory">
      <InventoryContainer entityID={props.entity.id} inventory={props.entity.inventory} />
   </div>;
}

export default BarrelInventory;