import Board from "./Board";
import Player from "./entities/Player";
import { isDev } from "./utils";
import { renderPlayerNames, createTextCanvasContext } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/ChatBox";
import { HitboxType, InitialGameDataPacket, lerp, Point, SETTINGS } from "webgl-test-shared";
import { calculateEntityRenderValues, setFrameProgress } from "./entities/Entity";
import { createEntityShaders, renderEntities } from "./entity-rendering";
import Client from "./client/Client";
import { calculateCursorWorldPosition, handleMouseMovement, renderCursorTooltip } from "./mouse";
import { updateDevEntityViewer } from "./components/game/DevEntityViewer";
import OPTIONS from "./options";
import { createShaderStrings, createWebGLContext, createWebGLProgram, gl, resizeCanvas } from "./webgl";
import { loadTextures } from "./textures";
import { hidePauseScreen, showPauseScreen, toggleSettingsMenu } from "./components/game/GameScreen";
import { getGameState } from "./components/App";
import Hitbox from "./hitboxes/Hitbox";
import CircularHitbox from "./hitboxes/CircularHitbox";
import { updateDebugScreenCurrentTime, updateDebugScreenFPS, updateDebugScreenTicks } from "./components/game/DebugScreen";
import Item from "./items/Item";
import { createPlaceableItemProgram, renderGhostPlaceableItem } from "./items/PlaceableItem";

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
}

let lastRenderTime = Math.floor(new Date().getTime() / 1000);
let numRenders = 0;

abstract class Game {
   private static readonly NIGHT_DARKNESS = 0.6;

   public static ticks: number;
   public static time: number;

   public static board: Board;
   
   public static isRunning: boolean = false;
   private static isPaused: boolean = false;

   /** If the game has recevied up-to-date game data from the server. Set to false when paused */
   public static isSynced: boolean = true;

   private static lastTime: number = 0;
   /** Amount of time the game is through the current frame */
   private static lag: number = 0;

   public static cursorPosition: Point | null;

   private static nightProgram: WebGLProgram;
   private static nightBuffer: WebGLBuffer;
   private static nightProgramVertPosAttribLocation: GLint;
   private static nightProgramDarkenFactorUniformLocation: WebGLUniformLocation;

   public static setTicks(ticks: number): void {
      this.ticks = ticks;
      this.time = (this.ticks * SETTINGS.TIME_PASS_RATE / SETTINGS.TPS / 3600) % 24;

      if (typeof updateDebugScreenCurrentTime !== "undefined") {
         updateDebugScreenCurrentTime(this.time);
      }
      if (typeof updateDebugScreenTicks !== "undefined") {
         updateDebugScreenTicks(this.ticks);
      }
   }

   /** Starts the game */
   public static start(): void {
      this.nightProgram = createWebGLProgram(nightVertexShaderText, nightFragmentShaderText, "a_vertPosition");
      this.nightProgramVertPosAttribLocation = gl.getAttribLocation(this.nightProgram, "a_vertPosition");
      this.nightProgramDarkenFactorUniformLocation = gl.getUniformLocation(this.nightProgram, "u_darkenFactor")!;
      this.createNightBuffer();

      createEventListeners();
      resizeCanvas();
               
      // Start the game loop
      this.isRunning = true;
      requestAnimationFrame(time => this.main(time));
   }

   private static createNightBuffer(): void {
      const vertices = [
         -1, -1,
         1, 1,
         -1, 1,
         -1, -1,
         1, -1,
         1, 1
      ];
      
      this.nightBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.nightBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   }

   public static pause(): void {
      this.isPaused = true;
      showPauseScreen();

      this.isSynced = false;

      Client.sendDeactivatePacket();
   }
   public static unpause(): void {
      this.isPaused = false;
      hidePauseScreen();

      Client.sendActivatePacket();
   }
   public static getIsPaused(): boolean {
      return this.isPaused;
   }
   
   public static sync(): void {
      Game.lastTime = performance.now();
      this.isSynced = true;
   }
   
   /**
    * Prepares the game to be played. Called once just before the game starts.
    */
   public static async initialise(initialGameDataPacket: InitialGameDataPacket, username: string): Promise<void> {
      createWebGLContext();
      createShaderStrings();
      createTextCanvasContext();

      const tiles = Client.parseServerTileDataArray(initialGameDataPacket.tiles);
      this.board = new Board(tiles);

      // Spawn the player
      Player.instance = null;
      const playerSpawnPosition = new Point(initialGameDataPacket.spawnPosition[0], initialGameDataPacket.spawnPosition[1]);
      const hitboxes = new Set<Hitbox<HitboxType>>([
         new CircularHitbox({
            type: "circular",
            radius: 32
         })
      ]);
      new Player(playerSpawnPosition, hitboxes, initialGameDataPacket.playerID, null, username);

      createEntityShaders();

      createPlaceableItemProgram();
      
      await loadTextures();

      Client.unloadGameDataPacket(initialGameDataPacket);
   }

   private static update(): void {
      updateSpamFilter();

      Item.decrementGlobalItemSwitchDelay();

      this.board.tickEntities();
      this.board.resolveCollisions();

      if (isDev()) updateDevEntityViewer();
   }

   /**
    * 
    * @param frameProgress How far the game is into the current frame (0 = frame just started, 0.99 means frame is about to end)
    */
   private static render(frameProgress: number): void {
      // Player rotation is updated each render, but only sent each update
      Player.updateRotation();
      
      const currentRenderTime = Math.floor(new Date().getTime() / 1000);
      numRenders++;
      if (currentRenderTime !== lastRenderTime) {
         updateDebugScreenFPS(numRenders);
         numRenders = 0;
      }
      lastRenderTime = currentRenderTime;

      // Clear the canvas
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      setFrameProgress(frameProgress);
      calculateEntityRenderValues();

      // Update the camera
      if (Player.instance !== null) {
         Camera.setCameraPosition(Player.instance.renderPosition);
         Camera.updateVisibleChunkBounds();
      }

      renderPlayerNames();

      this.board.renderTiles();
      this.board.renderItems();
      this.board.renderBorder();
      if (OPTIONS.showChunkBorders) {
         this.board.drawChunkBorders();
      }
      renderEntities();

      renderGhostPlaceableItem();

      this.cursorPosition = calculateCursorWorldPosition();
      renderCursorTooltip();

      this.renderNight();
   }

   public static main(currentTime: number): void {
      if (this.isSynced) {
         const deltaTime = currentTime - this.lastTime;
         this.lastTime = currentTime;

         // Update
         this.lag += deltaTime;
         while (this.lag >= 1000 / SETTINGS.TPS) {
            this.update();
            Client.sendPlayerDataPacket();
            this.lag -= 1000 / SETTINGS.TPS;
         }

         const frameProgress = this.lag / 1000 * SETTINGS.TPS;
         this.render(frameProgress);
      }

      if (this.isRunning) {
         requestAnimationFrame(time => this.main(time));
      }
   }

   private static renderNight(): void {
      // Don't render nighttime if it is day
      if (this.time >= 6 && this.time < 18) return;

      let darkenFactor: number;
      if (this.time >= 18 && this.time < 20) {
         darkenFactor = lerp(0, this.NIGHT_DARKNESS, (this.time - 18) / 2);
      } else if (this.time >= 4 && this.time < 6) {
         darkenFactor = lerp(0, this.NIGHT_DARKNESS, (6 - this.time) / 2);
      } else {
         darkenFactor = this.NIGHT_DARKNESS;
      }

      gl.useProgram(this.nightProgram);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.nightBuffer);

      gl.vertexAttribPointer(this.nightProgramVertPosAttribLocation, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.enableVertexAttribArray(this.nightProgramVertPosAttribLocation);

      gl.uniform1f(this.nightProgramDarkenFactorUniformLocation, darkenFactor);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.disable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ZERO);
   }
}

export default Game;