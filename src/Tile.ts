import { BiomeName } from "./biomes";

export enum TileType {
   grass,
   dirt,
   water,
   sludge,
   rock,
   sand,
   sandstone,
   snow,
   ice,
   magma,
   lava
}

type TileEffects = {
   readonly moveSpeedMultiplier?: number;
   readonly walkDamage?: number;
   // readonly statusEffectOnWalk?: {
   //    readonly type: StatusEffectType;
   //    readonly duration: number;
   // }
}

type TileTypeInfo = {
   readonly textureSource: string;
   /** How quickly an entity loses velocity on the tile (1 = instant, 0 = maintains) */
   readonly friction: number;
   readonly effects?: TileEffects;
}

const DEFAULT_FRICTION = 0.5;

export const TILE_TYPE_INFO_RECORD: { [key in TileType]: TileTypeInfo } = {
   [TileType.grass]: {
      textureSource: "grass.jpg",
      friction: DEFAULT_FRICTION
   },
   [TileType.dirt]: {
      textureSource: "grass.jpg",
      friction: DEFAULT_FRICTION
   },
   [TileType.water]: {
      textureSource: "grass.jpg",
      friction: DEFAULT_FRICTION
   },
   [TileType.sludge]: {
      textureSource: "grass.jpg",
      friction: DEFAULT_FRICTION
   },
   [TileType.rock]: {
      textureSource: "grass.jpg",
      friction: DEFAULT_FRICTION
   },
   [TileType.sand]: {
      textureSource: "grass.jpg",
      friction: DEFAULT_FRICTION
   },
   [TileType.sandstone]: {
      textureSource: "grass.jpg",
      friction: DEFAULT_FRICTION
   },
   [TileType.snow]: {
      textureSource: "grass.jpg",
      friction: 0.7
   },
   [TileType.ice]: {
      textureSource: "grass.jpg",
      friction: 0.15
   },
   [TileType.magma]: {
      textureSource: "grass.jpg",
      friction: DEFAULT_FRICTION
   },
   [TileType.lava]: {
      textureSource: "grass.jpg",
      friction: 0.8
   }
};

export interface TileInfo {
   readonly type: TileType;
   readonly biome: BiomeName;
   readonly isWall: boolean;
}

class Tile implements TileInfo {
   public readonly type: TileType;
   public readonly biome: BiomeName;
   public readonly isWall: boolean;

   constructor({ type, biome, isWall }: TileInfo) {
      this.type = type;
      this.biome = biome;
      this.isWall = isWall;
   }
}

export default Tile;