import Board from "./Board";
import Player from "./entities/Player";
import SETTINGS from "./settings";
import { Point } from "./utils";
import { createCircleProgram } from "./webgl";

abstract class Game {
   public static setup(): void {
      createCircleProgram();

      Board.setup();
      this.spawnPlayer();

      // Start the game loop
      setInterval(this.main, 1000 / SETTINGS.tps);
   }

   public static main(): void {
      Board.update();
      Board.render();
   }

   private static spawnPlayer(): void {
      const position = new Point(0, 0);
      const player = new Player(position);
      Board.addEntity(player);
   }
}

export default Game;