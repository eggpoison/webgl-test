import { EntityInfoClientArgs, EntityType, Point } from "webgl-test-shared";
import Boulder from "./entities/Boulder";
import Cow from "./entities/Cow";
import Entity from "./entities/Entity";
import Player from "./entities/Player";
import Tombstone from "./entities/Tombstone";
import Tree from "./entities/Tree";
import Workbench from "./entities/Workbench";
import Zombie from "./entities/Zombie";
import BerryBush from "./entities/BerryBush";
import Cactus from "./entities/Cactus";
import Yeti from "./entities/Yeti";
import IceSpikes from "./entities/IceSpikes";
import Slime from "./entities/Slime";
import Slimewisp from "./entities/Slimewisp";
import Tribesman from "./entities/Tribesman";
import TribeTotem from "./entities/TribeTotem";
import TribeHut from "./entities/TribeHut";
import Barrel from "./entities/Barrel";
import Campfire from "./entities/Campfire";
import Furnace from "./entities/Furnace";
import Snowball from "./entities/Snowball";
import Krumblid from "./entities/Krumblid";
import FrozenYeti from "./entities/FrozenYeti";
import Fish from "./entities/Fish";

export type EntityClassType<T extends EntityType> = new (position: Point, id: number, renderDepth: number, ...clientParams: Parameters<EntityInfoClientArgs[T]>) => Entity;

const ENTITY_CLASS_RECORD: { [E in EntityType]: () => EntityClassType<E>} = {
   [EntityType.cow]: () => Cow,
   [EntityType.zombie]: () => Zombie,
   [EntityType.tombstone]: () => Tombstone,
   [EntityType.tree]: () => Tree,
   [EntityType.workbench]: () => Workbench,
   [EntityType.boulder]: () => Boulder,
   [EntityType.berry_bush]: () => BerryBush,
   [EntityType.cactus]: () => Cactus,
   [EntityType.yeti]: () => Yeti,
   [EntityType.ice_spikes]: () => IceSpikes,
   [EntityType.slime]: () => Slime,
   [EntityType.slimewisp]: () => Slimewisp,
   [EntityType.tribesman]: () => Tribesman,
   [EntityType.player]: () => Player,
   [EntityType.tribe_totem]: () => TribeTotem,
   [EntityType.tribe_hut]: () => TribeHut,
   [EntityType.barrel]: () => Barrel,
   [EntityType.campfire]: () => Campfire,
   [EntityType.furnace]: () => Furnace,
   [EntityType.snowball]: () => Snowball,
   [EntityType.krumblid]: () => Krumblid,
   [EntityType.frozen_yeti]: () => FrozenYeti,
   [EntityType.fish]: () => Fish
};

export default ENTITY_CLASS_RECORD;