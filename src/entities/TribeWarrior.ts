import { EntityComponentsData, EntityType, Point, ServerComponentType } from "webgl-test-shared";
import Tribesman from "./Tribesman";
import FootprintComponent from "../entity-components/FootprintComponent";
import { ClientComponentType } from "../entity-components/components";
import HealthComponent from "../entity-components/HealthComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import InventoryUseComponent from "../entity-components/InventoryUseComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import { addTribeMemberRenderParts } from "./TribeMember";

class TribeWarrior extends Tribesman {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tribeWarrior>) {
      super(position, id, EntityType.tribeWarrior, ageTicks);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.inventory, new InventoryComponent(this, componentsData[5]));
      this.addServerComponent(ServerComponentType.inventoryUse, new InventoryUseComponent(this, componentsData[6]));
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.15, 20, 64, 4, 64));
      
      addTribeMemberRenderParts(this, componentsData[4]);
   }
}

export default TribeWarrior;