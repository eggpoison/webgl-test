import Board from "./Board";
import Player from "./entities/Player";
import SETTINGS from "webgl-test-shared/lib/settings";
import { Point, randInt } from "./utils";
import { renderPlayerNames } from "./text-canvas";
import Camera from "./Camera";

abstract class Game {
   public static start(): void {
      // Start the game loop
      setInterval(this.main, 1000 / SETTINGS.TPS);
   }

   /**
    * Runs the setup functions for various different parts of the game. Called once just before the game starts.
    */
   public static setup(): void {
      renderPlayerNames();
   }

   public static main(): void {
      Board.update();
      Camera.updateVisibleChunkBounds();
      Board.render();
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