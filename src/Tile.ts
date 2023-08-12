import { BiomeName, TileInfo, TileType } from "webgl-test-shared";

export class Tile implements TileInfo {
   public readonly x: number;
   public readonly y: number;

   public type: TileType;
   public biomeName: BiomeName;
   public isWall: boolean;

   public flowDirection?: number;
   public flowOffset = Math.random();

   constructor(x: number, y: number, tileInfo: TileInfo) {
      this.x = x;
      this.y = y;

      this.type = tileInfo.type;
      this.biomeName = tileInfo.biomeName;
      this.isWall = tileInfo.isWall;
   }
}