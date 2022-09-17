import { EntityType } from "webgl-test-shared";

type ClientEntityInfo = {
   readonly name: string;
   readonly description: string;
}

const CLIENT_ENTITY_INFO_RECORD: Record<EntityType, ClientEntityInfo> = {
   cow: {
      name: "Cow",
      description: "Mmm, beef..."
   },
   player: {
      name: "Player",
      description: "That's you."
   }
};

export default CLIENT_ENTITY_INFO_RECORD