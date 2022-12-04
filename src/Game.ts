import Board from "./Board";
import Player from "./entities/Player";
import { isDev } from "./utils";
import { renderPlayerNames, createTextCanvasContext } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/ChatBox";
import { lerp, Point, randInt, SETTINGS } from "webgl-test-shared";
import { calculateEntityRenderValues, setFrameProgress } from "./entities/Entity";
import { createEntityShaders, renderEntities } from "./entity-rendering";
import Client, { GameData } from "./client/Client";
import { calculateCursorWorldPosition, handleMouseMovement, renderCursorTooltip } from "./mouse";
import { updateDevEntityViewer } from "./components/DevEntityViewer";
import OPTIONS from "./options";
import { createWebGLContext, createWebGLProgram, gl, resizeCanvas } from "./webgl";
import { loadTextures } from "./textures";
import { hidePauseScreen, showPauseScreen, toggleSettingsMenu } from "./components/game/GameScreen";
import { getGameState } from "./components/App";
import { clearPressedKeys } from "./keyboard-input";

const nightVertexShaderText = `
precision mediump float;

attribute vec2 a_vertPosition;
 
void main() {
   gl_Position = vec4(a_vertPosition, 0.0, 1.0);
}
`;
const nightFragmentShaderText = `
precision mediump float;

uniform float u_darkenFactor;
 
void main() {
   gl_FragColor = vec4(0.0, 0.0, 0.0, u_darkenFactor);
}
`;

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
   private static readonly NIGHT_DARKNESS = 0.6;

   public static ticks: number;
   public static time: number;

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

   private static nightProgram: WebGLProgram;
   private static nightProgramVertPosAttribLocation: GLint;
   private static nightProgramDarkenFactorUniformLocation: WebGLUniformLocation;

   public static setTicks(ticks: number): void {
      this.ticks = ticks;
      this.time = (this.ticks * SETTINGS.TIME_PASS_RATE / SETTINGS.TPS / 60) % 24;
   }

   /** Starts the game */
   public static async start(): Promise<void> {
      this.nightProgram = createWebGLProgram(nightVertexShaderText, nightFragmentShaderText);
      this.nightProgramVertPosAttribLocation = gl.getAttribLocation(this.nightProgram, "a_vertPosition");
      this.nightProgramDarkenFactorUniformLocation = gl.getUniformLocation(this.nightProgram, "u_darkenFactor")!;

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
      new Player(playerSpawnPosition, gameData.playerID, null, username);

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
      // Clear the canvas
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      setFrameProgress(frameProgress);
      calculateEntityRenderValues();

      // Update the camera
      Camera.setCameraPosition(Player.instance!.renderPosition);
      Camera.updateVisibleChunkBounds();

      renderPlayerNames();

      this.board.renderTiles();
      this.board.renderItems();
      this.board.renderBorder();
      if (OPTIONS.showChunkBorders) {
         this.board.drawChunkBorders();
      }
      renderEntities();

      this.cursorPosition = calculateCursorWorldPosition();
      renderCursorTooltip();

      // Draw nighttime
      if (this.time < 6 || this.time >= 18) {
         let darkenFactor: number;
         if (this.time >= 18 && this.time < 20) {
            darkenFactor = lerp(0, this.NIGHT_DARKNESS, (this.time - 18) / 2);
         } else if (this.time >= 4 && this.time < 6) {
            darkenFactor = lerp(0, this.NIGHT_DARKNESS, (6 - this.time) / 2);
         } else {
            darkenFactor = this.NIGHT_DARKNESS;
         }

         const vertices = [-1, -1, 1, 1, -1, 1, -1, -1, 1, -1, 1, 1];

         gl.enable(gl.BLEND);
         gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

         gl.useProgram(this.nightProgram);

         gl.vertexAttribPointer(this.nightProgramVertPosAttribLocation, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
         gl.enableVertexAttribArray(this.nightProgramVertPosAttribLocation);

         gl.uniform1f(this.nightProgramDarkenFactorUniformLocation, darkenFactor);

         const buffer = gl.createBuffer();
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
         gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

         gl.drawArrays(gl.TRIANGLES, 0, 6);

         gl.disable(gl.BLEND);
         gl.blendFunc(gl.ONE, gl.ZERO);
      }
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
}

export default Game;