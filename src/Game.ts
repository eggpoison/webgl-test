import Board from "./Board";
import Player from "./entities/Player";
import { SETTINGS } from "webgl-test-shared";
import { Point, randInt } from "./utils";
import { renderPlayerNames } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/ChatBox";

abstract class Game {
   public static isRunning: boolean = false;

   public static start(): void {
      // Start the game loop
      this.main();
      setInterval(this.main, 1000 / SETTINGS.TPS);

      this.isRunning = true;
   }

   /**
    * Runs the setup functions for various different parts of the game. Called once just before the game starts.
    */
   public static setup(): void {
   }

   public static main(): void {
      updateSpamFilter();
      Board.update();
      Camera.updateCameraPosition();
      renderPlayerNames();
      Camera.updateVisibleChunkBounds();
      Board.render();
   }

   public static spawnPlayer(name: string): Point {
      // const x = randInt(0, SETTINGS.BOARD_SIZE * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
      // const y = randInt(0, SETTINGS.BOARD_SIZE * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
      if (1+1===3)console.log(randInt(0, 1));
      const x = 100;
      const y = 100;

      const position = new Point(x, y);
      const player = new Player(position, name, true);
      Board.addEntity(player);

      return position;
   }
}

export default Game;