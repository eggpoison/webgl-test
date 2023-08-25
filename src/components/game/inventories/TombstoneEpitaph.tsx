import { PlayerCauseOfDeath, veryBadHash } from "webgl-test-shared";
import Entity from "../../../entities/Entity"
import Tombstone from "../../../entities/Tombstone";

// __NAME__'s brain exploded.

const LIFE_MESSAGES: ReadonlyArray<string> = [
   "He lived as he died, kicking buckets."
];
// 

const TOMBSTONE_DEATH_MESSAGES: Record<PlayerCauseOfDeath, string> = {
   [PlayerCauseOfDeath.zombie]: "Ripped to pieces",
   [PlayerCauseOfDeath.yeti]: "Tried to hug a yeti",
   [PlayerCauseOfDeath.god]: "Struck down by divine judgement",
   [PlayerCauseOfDeath.berry_bush]: "Pricked to death",
   [PlayerCauseOfDeath.fire]: "Unhealthily flammable",
   [PlayerCauseOfDeath.poison]: "Poisoned",
   [PlayerCauseOfDeath.tribe_member]: "Died to a tribe member",
   [PlayerCauseOfDeath.arrow]: "Impaled by an arrow",
   [PlayerCauseOfDeath.ice_spikes]: "Died to ice spikes",
   [PlayerCauseOfDeath.ice_shards]: "Impaled by an ice shard",
   [PlayerCauseOfDeath.cactus]: "Impaled by an arrow",
   [PlayerCauseOfDeath.snowball]: "Crushed by a snowball",
   [PlayerCauseOfDeath.slime]: "Absorbed by a slime",
};

interface TombstoneInventoryProps {
   readonly entity: Entity;
}

function assertEntityIsTombstone(entity: Entity): asserts entity is Tombstone {
   if (entity.type !== "tombstone") {
      throw new Error("Entity passed into TombstoneEpitaph wasn't a tombstone.");
   }
}

const TombstoneEpitaph = (props: TombstoneInventoryProps) => {
   assertEntityIsTombstone(props.entity);

   const causeOfDeath = TOMBSTONE_DEATH_MESSAGES[props.entity.deathInfo!.causeOfDeath];

   // Choose a random life message based off the entity's id
   const hash = veryBadHash(props.entity.id.toString());
   const lifeMessage = LIFE_MESSAGES[hash % LIFE_MESSAGES.length];

   return <div id="tombstone-epitaph">
      <div className="content">
         <h1 className="name">{props.entity.deathInfo!.username}</h1>

         <p className="life-message">{lifeMessage}</p>

         <h3 className="cause-of-death-caption">CAUSE OF DEATH</h3>
         <p className="cause-of-death">{causeOfDeath}</p>
      </div>
   </div>;
}

export default TombstoneEpitaph;