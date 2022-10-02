import Board from "./Board";
import Player from "./entities/Player";
import { isDev, sleep } from "./utils";
import { renderPlayerNames } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/ChatBox";
import { Point, randInt, SETTINGS } from "webgl-test-shared";
import Entity, { calculateEntityRenderPositions, setFrameProgress } from "./entities/Entity";
import { renderEntities } from "./entity-rendering";
import Client from "./client/Client";
import { hidePauseScreen, showPauseScreen } from "./components/App";
import { calculateCursorWorldPosition, renderCursorTooltip } from "./mouse";
import { updateDevEntityViewer } from "./components/DevEntityViewer";
import OPTIONS from "./options";
import { gl } from ".";

export type ClientAttackInfo = {
   readonly targetEntity: Entity;
   readonly progress: number;
}

abstract class Game {
   public static isRunning: boolean = false;
   private static _isPaused: boolean = false;

   /** If the game has recevied up-to-date game data from the server. Set to false when paused */
   public static isSynced: boolean = true;

   private static lastTime: number;
   /** Amount of time the game is through the current frame */
   private static lag: number = 0;

   public static cursorPosition: Point | null;

   private static attackInfoRecord: { [id: number]: ClientAttackInfo } = {};

   public static async start(): Promise<void> {
      this.isRunning = true;
      
      // Start the game loop
      while (this.isRunning) {
         if (!this._isPaused && this.isSynced) {
            await this.main();
         } else {
            // Stop infinite loops
            await sleep(5);
         }
      }
   }

   public static get isPaused(): boolean {
      return this._isPaused;
   }
   public static set isPaused(newValue: boolean) {
      this._isPaused = newValue;
      newValue ? showPauseScreen() : hidePauseScreen();

      if (!newValue) {
         this.isSynced = false;
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
      Client.sendPlayerDataPacket();

      if (isDev()) updateDevEntityViewer();
   }

   /**
    * 
    * @param frameProgress How far the game is into the current frame (0 = frame just started, 0.99 means frame is about to end)
    */
   private static render(frameProgress: number): void {
      // Clear
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      setFrameProgress(frameProgress);
      calculateEntityRenderPositions();

      // Update the camera
      Camera.updateCameraPosition();
      Camera.updateVisibleChunkBounds();

      renderPlayerNames();

      Board.renderTiles();
      Board.renderItems();
      Board.drawBorder();
      if (OPTIONS.showChunkBorders) {
         Board.drawChunkBorders();
      }
      renderEntities();

      this.cursorPosition = calculateCursorWorldPosition();
      renderCursorTooltip();
   }

   public static main(): Promise<void> {
      return new Promise(async resolve => {
         const currentTime = new Date().getTime();
         const deltaTime = currentTime - Game.lastTime;
         Game.lastTime = currentTime;

         // Allow time for user inputs
         await sleep(2);
         
         // Update
         Game.lag += deltaTime;
         while (Game.lag >= 1000 / SETTINGS.TPS) {
            Game.update();
            Game.lag -= 1000 / SETTINGS.TPS;
         }

         // Render the game and extrapolate positions using the amount of lag (frame progress)
         const frameProgress = Game.lag / 1000 * SETTINGS.TPS;
         Game.render(frameProgress);

         resolve();
      });
   }

   public static spawnPlayer(name: string, id: number): Point {
      // const x = randInt(0, SETTINGS.BOARD_SIZE * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
      // const y = randInt(0, SETTINGS.BOARD_SIZE * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
      if (1 + 1 === 3) console.log(randInt(0, 1));
      const x = 100;
      const y = 100;

      const position = new Point(x, y);
      new Player(id, position, null, null, 0, 0, name);

      return position;
   }

   public static loadAttackDataArray(clientAttacks: ReadonlyArray<ClientAttackInfo>): void {
      const attackInfoRecord: { [id: number]: ClientAttackInfo } = {};
      for (const attack of clientAttacks) {
         attackInfoRecord[attack.targetEntity.id] = attack;
      }
      this.attackInfoRecord = attackInfoRecord;
   }

   public static getClientAttack(targetID: number): ClientAttackInfo | null {
      if (this.attackInfoRecord.hasOwnProperty(targetID)) {
         return this.attackInfoRecord[targetID];
      }
      return null;
   }
}

export default Game;