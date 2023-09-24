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
      textureSource: "tiles/grass.png"
   },
   dirt: {
      textureSource: "tiles/dirt.png"
   },
   water: {
      isLiquid: true,
      textureSource: "tiles/water.png"
   },
   sludge: {
      // textureSource: "sludge.png"
      textureSource: "tiles/sludge-old.png"
   },
   slime: {
      textureSource: "tiles/slime.png"
   },
   rock: {
      textureSource: "tiles/rock.png"
   },
   darkRock: {
      textureSource: "tiles/dark-rock.png"
   },
   sand: {
      textureSource: "tiles/sand.png"
   },
   sandstone: {
      textureSource: "tiles/sandstone.png"
   },
   snow: {
      textureSource: "tiles/snow.png"
   },
   ice: {
      // textureSource: "ice.png"
      textureSource: "tiles/ice-old.png"
   },
   magma: {
      textureSource: "tiles/grass.png"
   },
   lava: {
      textureSource: "tiles/grass.png"
   },
   permafrost: {
      textureSource: "tiles/permafrost.png"
   }
};