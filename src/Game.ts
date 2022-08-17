import Board from "./Board";
import Player from "./entities/Player";
import { Point, randInt, sleep } from "./utils";
import { renderPlayerNames } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/ChatBox";
import { SETTINGS } from "webgl-test-shared";

abstract class Game {
   public static isRunning: boolean = false;

   private static lastTime: number;
   private static lag: number = 0;

   public static async start(): Promise<void> {
      this.isRunning = true;
      
      // Start the game loop
      while (this.isRunning) {
         await this.main();
      }
   }

   /**
    * Runs the setup functions for various different parts of the game. Called once just before the game starts.
    */
   public static setup(): void {
      Game.lastTime = new Date().getTime();
   }

   private static update(): void {
      updateSpamFilter();
      Board.update();
   }

   /**
    * 
    * @param frameProgress How far the game is into the current frame (0 = frame just started, 0.99 means frame is about to end)
    */
   private static render(frameProgress: number): void {
      // Update the camera
      Camera.updateCameraPosition(frameProgress);
      Camera.updateVisibleChunkBounds();

      renderPlayerNames();
      Board.render(frameProgress);
   }

   public static main(): Promise<void> {
      return new Promise(async resolve => {
         const currentTime = new Date().getTime();
         const deltaTime = currentTime - Game.lastTime;
         Game.lastTime = currentTime;

         // Allow time for user inputs
         await sleep(5);
         
         // Update
         Game.lag += deltaTime;
         while (Game.lag >= 1000 / SETTINGS.TPS) {
            Game.update();
            Game.lag -= 1000 / SETTINGS.TPS;
         }

         Game.render(Game.lag * SETTINGS.TPS / 1000);

         resolve();
      });
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