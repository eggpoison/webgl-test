import { EntityInfoClientArgs, EntityType, HitboxType, Point } from "webgl-test-shared";
import Boulder from "./entities/Boulder";
import Cow from "./entities/Cow";
import Entity from "./entities/Entity";
import Player from "./entities/Player";
import Tombstone from "./entities/Tombstone";
import Tree from "./entities/Tree";
import Workbench from "./entities/Workbench";
import Zombie from "./entities/Zombie";
import Hitbox from "./hitboxes/Hitbox";
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

export type EntityClassType<T extends EntityType> = new (position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, ...clientParams: Parameters<EntityInfoClientArgs[T]>) => Entity;

const ENTITY_CLASS_RECORD: { [E in EntityType]: () => EntityClassType<E>} = {
   cow: () => Cow,
   zombie: () => Zombie,
   tombstone: () => Tombstone,
   tree: () => Tree,
   workbench: () => Workbench,
   boulder: () => Boulder,
   berry_bush: () => BerryBush,
   cactus: () => Cactus,
   yeti: () => Yeti,
   ice_spikes: () => IceSpikes,
   slime: () => Slime,
   slimewisp: () => Slimewisp,
   tribesman: () => Tribesman,
   player: () => Player,
   tribe_totem: () => TribeTotem,
   tribe_hut: () => TribeHut,
   barrel: () => Barrel,
   campfire: () => Campfire,
   furnace: () => Furnace,
   snowball: () => Snowball
};

export default ENTITY_CLASS_RECORD;