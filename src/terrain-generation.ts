import Board from "./Board";
import Tile, { TileType } from "./Tile";

export function generateTerrain(): Array<Array<Tile>> {
   const tiles = new Array<Array<Tile>>(Board.DIMENSIONS);

   for (let x = 0; x < Board.DIMENSIONS; x++) {
      tiles[x] = new Array<Tile>(Board.DIMENSIONS);

      for (let y = 0; y < Board.DIMENSIONS; y++) {
         tiles[x][y] = (
            new Tile({
               type: TileType.grass,
               biome: "grasslands",
               isWall: false
            })
         );
      }
   }

   return tiles;
}