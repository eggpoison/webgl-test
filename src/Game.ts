import Board from "./Board";
import Player from "./entities/Player";
import { isDev } from "./utils";
import { renderPlayerNames, createTextCanvasContext } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/ChatBox";
import { Point, randInt, SETTINGS } from "webgl-test-shared";
import Entity, { calculateEntityRenderValues, setFrameProgress } from "./entities/Entity";
import { createEntityShaders, renderEntities } from "./entity-rendering";
import Client, { GameData } from "./client/Client";
import { calculateCursorWorldPosition, handleMouseMovement, renderCursorTooltip } from "./mouse";
import { updateDevEntityViewer } from "./components/DevEntityViewer";
import OPTIONS from "./options";
import { clearCanvas, createWebGLContext, resizeCanvas } from "./webgl";
import { loadTextures } from "./textures";
import { hidePauseScreen, showPauseScreen, toggleSettingsMenu } from "./components/GameScreen";
import { getGameState } from "./components/App";
import { clearPressedKeys } from "./keyboard-input";

export type ClientAttackInfo = {
   readonly targetEntity: Entity;
   readonly progress: number;
}

let listenersHaveBeenCreated = false;

const createEventListeners = (): void => {
   if (listenersHaveBeenCreated) return;
   listenersHaveBeenCreated = true;
   
   window.addEventListener("contextmenu", clearPressedKeys);

   window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape" && getGameState() === "game") {
         toggleSettingsMenu();
      }
   });
   
   window.addEventListener("focus", () => {
      Game.unpause();
   });
   window.addEventListener("blur", () => {
      Game.pause();
   });

   window.addEventListener("mousemove", handleMouseMovement);

   // Has to be arrow function as otherwise it has the wrong scope
   window.addEventListener("mousedown", () => Player.attack());
}

abstract class Game {
   public static board: Board;
   
   public static isRunning: boolean = false;
   private static isPaused: boolean = false;

   /** If the game has recevied up-to-date game data from the server. Set to false when paused */
   public static isSynced: boolean = true;

   private static lastTime: number;
   /** Amount of time the game is through the current frame */
   private static lag: number = 0;

   private static clientInformationTimer: number = 1 / SETTINGS.TPS;

   public static cursorPosition: Point | null;

   private static attackInfoRecord: { [id: number]: ClientAttackInfo } = {};

   /** Starts the game */
   public static async start(): Promise<void> {
      createEventListeners();
      resizeCanvas();

      Game.lastTime = new Date().getTime();
               
      // Start the game loop
      this.isRunning = true;
      this.main();
   }

   public static pause(): void {
      this.isPaused = true;
      showPauseScreen();

      this.isSynced = false;
   }
   public static unpause(): void {
      this.isPaused = false;
      hidePauseScreen();
   }
   public static getIsPaused(): boolean {
      return this.isPaused;
   }
   
   public static sync(): void {
      Game.lastTime = new Date().getTime();
      this.isSynced = true;
   }
   
   /**
    * Prepares the game to be played. Called once just before the game starts.
    */
   public static async initialise(gameData: GameData, username: string): Promise<void> {
      createWebGLContext();
      createTextCanvasContext();
      
      this.board = new Board(gameData.tiles);

      // Spawn the player
      Player.instance = null;
      const x = randInt(0, SETTINGS.BOARD_SIZE * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
      const y = randInt(0, SETTINGS.BOARD_SIZE * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
      const playerSpawnPosition = new Point(x, y);
      new Player(playerSpawnPosition, gameData.playerID, username);

      createEntityShaders();
      
      await loadTextures();
   }

   private static update(): void {
      updateSpamFilter();

      this.board.tickEntities();
      this.board.resolveCollisions();

      if (isDev()) updateDevEntityViewer();
   }

   /**
    * 
    * @param frameProgress How far the game is into the current frame (0 = frame just started, 0.99 means frame is about to end)
    */
   private static render(frameProgress: number): void {
      clearCanvas();

      setFrameProgress(frameProgress);
      calculateEntityRenderValues();

      // Update the camera
      Camera.setCameraPosition(Player.instance!.renderPosition);
      Camera.updateVisibleChunkBounds();

      renderPlayerNames();

      this.board.renderTiles();
      this.board.renderItems();
      this.board.drawBorder();
      if (OPTIONS.showChunkBorders) {
         this.board.drawChunkBorders();
      }
      renderEntities();

      this.cursorPosition = calculateCursorWorldPosition();
      renderCursorTooltip();
   }

   public static main(): void {
      if (this.isSynced) {
         const currentTime = new Date().getTime();
         const deltaTime = currentTime - this.lastTime;
         this.lastTime = currentTime;

         // Send client info
         let shouldSendClientInfo = false;
         this.clientInformationTimer -= deltaTime;
         while (this.clientInformationTimer < 0) {
            shouldSendClientInfo = true;
            this.clientInformationTimer += 1 / SETTINGS.TPS;
         }
         if (shouldSendClientInfo) {
            Client.sendPlayerDataPacket();
         }
         
         // Update
         this.lag += deltaTime;
         while (this.lag >= 1000 / SETTINGS.TPS) {
            this.update();
            this.lag -= 1000 / SETTINGS.TPS;
         }
         
         // Render the game and extrapolate positions using the amount of lag (frame progress)
         const frameProgress = this.lag / 1000 * SETTINGS.TPS;
         this.render(frameProgress);
      }

      if (this.isRunning) {
         requestAnimationFrame(() => this.main());
      }
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