import { TileType } from "webgl-test-shared";

interface BaseTileTypeRenderInfo {
   readonly isLiquid?: boolean;
   readonly textureSource: string;
}

export interface SolidTileTypeRenderInfo extends BaseTileTypeRenderInfo {
   readonly isLiquid?: false;
}

export interface LiquidTileTypeRenderInfo extends BaseTileTypeRenderInfo {
   readonly isLiquid: true;
}

type TileTypeRenderInfo = SolidTileTypeRenderInfo | LiquidTileTypeRenderInfo;

export const TILE_TYPE_RENDER_INFO_RECORD: Record<TileType, TileTypeRenderInfo> = {
   grass: {
      textureSource: "grass.png"
   },
   dirt: {
      textureSource: "dirt.png"
   },
   water: {
      isLiquid: true,
      textureSource: "water.png"
   },
   sludge: {
      // textureSource: "sludge.png"
      textureSource: "sludge-old.png"
   },
   slime: {
      textureSource: "slime.png"
   },
   rock: {
      textureSource: "rock.png"
   },
   darkRock: {
      textureSource: "dark-rock.png"
   },
   sand: {
      textureSource: "sand.png"
   },
   sandstone: {
      textureSource: "sandstone.png"
   },
   snow: {
      textureSource: "snow.png"
   },
   ice: {
      // textureSource: "ice.png"
      textureSource: "ice-old.png"
   },
   magma: {
      textureSource: "grass.png"
   },
   lava: {
      textureSource: "grass.png"
   },
   permafrost: {
      textureSource: "permafrost.png"
   }
};