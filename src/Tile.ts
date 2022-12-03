import { BiomeName, TileInfo, TileType } from "webgl-test-shared";

export class Tile implements TileInfo {
   public readonly x: number;
   public readonly y: number;

   public type: TileType;
   public biome: BiomeName;
   public isWall: boolean;

   constructor(x: number, y: number, { type, biome, isWall }: TileInfo) {
      this.x = x;
      this.y = y;

      this.type = type;
      this.biome = biome;
      this.isWall = isWall;
   }
}