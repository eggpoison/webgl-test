import { TileType } from "webgl-test-shared";


type TileEffects = {
   readonly moveSpeedMultiplier?: number;
   readonly walkDamage?: number;
   // readonly statusEffectOnWalk?: {
   //    readonly type: StatusEffectType;
   //    readonly duration: number;
   // }
}

interface BaseTileTypeInfo {
   /** How quickly an entity loses velocity on the tile (1 = instant, 0 = no loss) */
   readonly friction: number;
   readonly effects?: TileEffects;
   readonly isLiquid?: boolean;
}

interface SolidTileTypeInfo extends BaseTileTypeInfo {
   readonly isLiquid?: false;
   readonly textureSource: string;
}

interface LiquidTileTypeInfo extends BaseTileTypeInfo {
   readonly isLiquid: true;
   readonly colour: [number, number, number];
}

const DEFAULT_FRICTION = 0.5;

export const TILE_TYPE_INFO_RECORD: { [key in TileType]: SolidTileTypeInfo | LiquidTileTypeInfo } = {
   [TileType.grass]: {
      textureSource: "grass.png",
      friction: DEFAULT_FRICTION
   },
   [TileType.dirt]: {
      textureSource: "dirt.png",
      friction: DEFAULT_FRICTION
   },
   [TileType.water]: {
      colour: [0, 240, 228],
      friction: DEFAULT_FRICTION,
      isLiquid: true
   },
   [TileType.sludge]: {
      textureSource: "sludge.png",
      friction: DEFAULT_FRICTION
   },
   [TileType.rock]: {
      textureSource: "rock.png",
      friction: DEFAULT_FRICTION
   },
   [TileType.sand]: {
      textureSource: "sand.png",
      friction: DEFAULT_FRICTION
   },
   [TileType.sandstone]: {
      textureSource: "grass.png",
      friction: DEFAULT_FRICTION
   },
   [TileType.snow]: {
      textureSource: "snow.png",
      friction: 0.7
   },
   [TileType.ice]: {
      textureSource: "grass.png",
      friction: 0.15
   },
   [TileType.magma]: {
      textureSource: "grass.png",
      friction: DEFAULT_FRICTION
   },
   [TileType.lava]: {
      textureSource: "grass.png",
      friction: 0.8
   }
};