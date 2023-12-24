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
import DroppedItem from "./items/DroppedItem";
import GameObject from "./GameObject";
import WoodenArrowProjectile from "./projectiles/WoodenArrowProjectile";
import IceShardsProjectile from "./projectiles/IceShardsProjectile";
import RockSpikeProjectile from "./projectiles/RockSpikeProjectile";

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
   [EntityType.tribesman]: () => Tribesman,
   [EntityType.player]: () => Player,
   [EntityType.tribeTotem]: () => TribeTotem,
   [EntityType.tribeHut]: () => TribeHut,
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
   [EntityType.rockSpikeProjectile]: () => RockSpikeProjectile
};

export default ENTITY_CLASS_RECORD;