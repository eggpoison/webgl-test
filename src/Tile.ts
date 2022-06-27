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

type TileTypeInfo = {
   readonly textureSource: string;
}

export const TILE_TYPE_INFO_RECORD: { [key in TileType]: TileTypeInfo } = {
   [TileType.grass]: {
      textureSource: "grass.jpg"
   },
   [TileType.dirt]: {
      textureSource: "grass.jpg"
   },
   [TileType.water]: {
      textureSource: "grass.jpg"
   },
   [TileType.sludge]: {
      textureSource: "grass.jpg"
   },
   [TileType.rock]: {
      textureSource: "grass.jpg"
   },
   [TileType.sand]: {
      textureSource: "grass.jpg"
   },
   [TileType.sandstone]: {
      textureSource: "grass.jpg"
   },
   [TileType.snow]: {
      textureSource: "grass.jpg"
   },
   [TileType.ice]: {
      textureSource: "grass.jpg"
   },
   [TileType.magma]: {
      textureSource: "grass.jpg"
   },
   [TileType.lava]: {
      textureSource: "grass.jpg"
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