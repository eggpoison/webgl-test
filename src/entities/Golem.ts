import { ServerComponentType, EntityComponentsData, EntityType, Point } from "webgl-test-shared";
import GolemComponent from "../entity-components/GolemComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import HealthComponent from "../entity-components/HealthComponent";
import PhysicsComponent from "../entity-components/PhysicsComponent";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import Entity from "../Entity";

class Golem extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.golem>) {
      super(position, id, EntityType.golem, ageTicks);

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.golem, new GolemComponent(this, componentsData[3]));
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.3, 20, 96, 5, 50));
   }
}

export default Golem;