import { BiomeName, TileInfo, TileType } from "webgl-test-shared";

export class Tile implements TileInfo {
   public readonly x: number;
   public readonly y: number;

   public type: TileType;
   public biomeName: BiomeName;
   public isWall: boolean;

   public bordersWater = false;
   public bordersWall = false;

   public flowOffset = Math.random();

   constructor(x: number, y: number, tileType: TileType, biomeName: BiomeName, isWall: boolean) {
      this.x = x;
      this.y = y;

      this.type = tileType;
      this.biomeName = biomeName;
      this.isWall = isWall;
   }
}