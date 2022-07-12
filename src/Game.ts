import Board from "./Board";
import Player from "./entities/Player";
import SETTINGS from "webgl-test-shared/lib/settings";
import { Point, randInt } from "./utils";
import { renderText } from "./text-canvas";

abstract class Game {
   public static start(): void {
      // Start the game loop
      setInterval(this.main, 1000 / SETTINGS.TPS);
   }

   public static main(): void {
      Board.update();
      Board.render();
      renderText();
   }

   public static spawnPlayer(name: string): Point {
      const x = randInt(0, SETTINGS.BOARD_SIZE * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
      const y = randInt(0, SETTINGS.BOARD_SIZE * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);

      const position = new Point(x, y);
      const player = new Player(position, name, true);
      Board.addEntity(player);

      return position;
   }
}

export default Game;