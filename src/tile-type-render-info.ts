import { TileType } from "webgl-test-shared";

interface BaseTileTypeRenderInfo {
   readonly isLiquid?: boolean;
}

interface SolidTileTypeRenderInfo extends BaseTileTypeRenderInfo {
   readonly isLiquid?: false;
   readonly textureSource: string;
}

interface LiquidTileTypeRenderInfo extends BaseTileTypeRenderInfo {
   readonly isLiquid: true;
   readonly colour: [number, number, number];
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
      colour: [0, 240, 228],
      isLiquid: true
   },
   sludge: {
      textureSource: "sludge.png"
   },
   rock: {
      textureSource: "rock.png"
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
      textureSource: "ice.png"
   },
   magma: {
      textureSource: "grass.png"
   },
   lava: {
      textureSource: "grass.png"
   }
};