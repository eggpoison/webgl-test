import { EntityInfoClientArgs, EntityType, Point } from "webgl-test-shared";
import Cow from "./entities/Cow";
import Entity from "./entities/Entity";
import Player from "./entities/Player";
import Tombstone from "./entities/Tombstone";
import Zombie from "./entities/Zombie";

export type EntityClassType<T extends EntityType> = new (position: Point, id: number, secondsSinceLastHit: number | null, ...clientParams: Parameters<EntityInfoClientArgs[T]>) => Entity;

const ENTITY_CLASS_RECORD: { [id in EntityType]: () => EntityClassType<id>} = {
   cow: () => Cow,
   zombie: () => Zombie,
   tombstone: () => Tombstone,
   player: () => Player
};

export default ENTITY_CLASS_RECORD;