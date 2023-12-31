import { EntityType, Point, EntityInfoClientArgs } from "webgl-test-shared";
import Boulder from "./entities/Boulder";
import Cow from "./entities/Cow";
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
import TribeTotem from "./entities/TribeTotem";
import WorkerHut from "./entities/WorkerHut";
import Barrel from "./entities/Barrel";
import Campfire from "./entities/Campfire";
import Furnace from "./entities/Furnace";
import Snowball from "./entities/Snowball";
import Krumblid from "./entities/Krumblid";
import FrozenYeti from "./entities/FrozenYeti";
import Fish from "./entities/Fish";
import DroppedItem from "./items/DroppedItem";
import GameObject from "./GameObject";
import WoodenArrowProjectile from "./projectiles/WoodenArrowProjectile";
import IceShardsProjectile from "./projectiles/IceShardsProjectile";
import RockSpikeProjectile from "./projectiles/RockSpikeProjectile";
import SpearProjectile from "./projectiles/SpearProjectile";
import ResearchBench from "./entities/ResearchBench";
import WarriorHut from "./entities/WarriorHut";
import TribeWorker from "./entities/TribeWorker";
import TribeWarrior from "./entities/TribeWarrior";

export type EntityClassType<T extends EntityType> = new (position: Point, id: number, renderDepth: number, ...clientParams: Parameters<typeof EntityInfoClientArgs[T]>) => GameObject;

const ENTITY_CLASS_RECORD: { [E in EntityType]: () => EntityClassType<E>} = {
   [EntityType.cow]: () => Cow,
   [EntityType.zombie]: () => Zombie,
   [EntityType.tombstone]: () => Tombstone,
   [EntityType.tree]: () => Tree,
   [EntityType.workbench]: () => Workbench,
   [EntityType.boulder]: () => Boulder,
   [EntityType.berryBush]: () => BerryBush,
   [EntityType.cactus]: () => Cactus,
   [EntityType.yeti]: () => Yeti,
   [EntityType.iceSpikes]: () => IceSpikes,
   [EntityType.slime]: () => Slime,
   [EntityType.slimewisp]: () => Slimewisp,
   [EntityType.tribeWorker]: () => TribeWorker,
   [EntityType.tribeWarrior]: () => TribeWarrior,
   [EntityType.player]: () => Player,
   [EntityType.tribeTotem]: () => TribeTotem,
   [EntityType.workerHut]: () => WorkerHut,
   [EntityType.warriorHut]: () => WarriorHut,
   [EntityType.barrel]: () => Barrel,
   [EntityType.campfire]: () => Campfire,
   [EntityType.furnace]: () => Furnace,
   [EntityType.snowball]: () => Snowball,
   [EntityType.krumblid]: () => Krumblid,
   [EntityType.frozenYeti]: () => FrozenYeti,
   [EntityType.fish]: () => Fish,
   [EntityType.itemEntity]: () => DroppedItem,
   [EntityType.woodenArrowProjectile]: () => WoodenArrowProjectile,
   [EntityType.iceShardProjectile]: () => IceShardsProjectile,
   [EntityType.rockSpikeProjectile]: () => RockSpikeProjectile,
   [EntityType.spearProjectile]: () => SpearProjectile,
   [EntityType.researchBench]: () => ResearchBench
};

export default ENTITY_CLASS_RECORD;