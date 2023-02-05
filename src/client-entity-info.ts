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
   zombie: {
      name: "Zombie",
      description: ""
   },
   tombstone: {
      name: "Tombstone",
      description: ""
   },
   player: {
      name: "Player",
      description: "That's you!"
   },
   tree: {
      name: "Tree",
      description: ""
   },
   workbench: {
      name: "Workbench",
      description: ""
   },
   boulder: {
      name: "Boulder",
      description: ""
   }
};

export default CLIENT_ENTITY_INFO_RECORD;