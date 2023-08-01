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
   },
   berry_bush: {
      name: "Berry Bush",
      description: ""
   },
   cactus: {
      name: "Cactus",
      description: ""
   },
   yeti: {
      name: "Yeti",
      description: ""
   },
   ice_spikes: {
      name: "Ice Spikes",
      description: ""
   },
   slime: {
      name: "Slime",
      description: ""
   },
   slimewisp: {
      name: "Slimewisp",
      description: ""
   }
};

export default CLIENT_ENTITY_INFO_RECORD;