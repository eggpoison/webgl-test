import { EntityInfoClientArgs, EntityType, HitboxType, Point } from "webgl-test-shared";
import Cow from "./entities/Cow";
import Entity from "./entities/Entity";
import Player from "./entities/Player";
import Tombstone from "./entities/Tombstone";
import Tree from "./entities/Tree";
import Workbench from "./entities/Workbench";
import Zombie from "./entities/Zombie";
import Hitbox from "./hitboxes/Hitbox";

export type EntityClassType<T extends EntityType> = new (position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, ...clientParams: Parameters<EntityInfoClientArgs[T]>) => Entity;

const ENTITY_CLASS_RECORD: { [id in EntityType]: () => EntityClassType<id>} = {
   cow: () => Cow,
   zombie: () => Zombie,
   tombstone: () => Tombstone,
   player: () => Player,
   tree: () => Tree,
   workbench: () => Workbench
};

export default ENTITY_CLASS_RECORD;