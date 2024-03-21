import { EntityComponentsData, EntityType, Point, ServerComponentType } from "webgl-test-shared";
import Tribesman from "./Tribesman";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import HealthComponent from "../entity-components/HealthComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import InventoryUseComponent from "../entity-components/InventoryUseComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import { addTribeMemberRenderParts } from "./TribeMember";
import TribesmanComponent from "../entity-components/TribesmanComponent";
import EquipmentComponent from "../entity-components/EquipmentComponent";

class TribeWorker extends Tribesman {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tribeWorker>) {
      super(position, id, EntityType.tribeWorker, ageTicks);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.inventory, new InventoryComponent(this, componentsData[5]));
      this.addServerComponent(ServerComponentType.inventoryUse, new InventoryUseComponent(this, componentsData[6]));
      this.addServerComponent(ServerComponentType.tribesman, new TribesmanComponent(this, componentsData[7]));
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.15, 20, 64, 4, 50));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));
      
      addTribeMemberRenderParts(this, componentsData[4]);
   }
}

export default TribeWorker;