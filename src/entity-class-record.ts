import { EntityInfoClientArgs, EntityType, Point } from "webgl-test-shared";
import Cow from "./entities/Cow";
import Entity from "./entities/Entity";
import Player from "./entities/Player";

export type EntityClassType<T extends EntityType> = new (position: Point, id: number, ...clientParams: Parameters<EntityInfoClientArgs[T]>) => Entity;

const ENTITY_CLASS_RECORD: { [id in EntityType]: () => EntityClassType<id>} = {
   cow: () => Cow,
   player: () => Player
};

export default ENTITY_CLASS_RECORD;