import Board from "./Board";
import Player, { tickPlayerInstanceTimeSinceHit, updateAvailableCraftingRecipes, updatePlayerRotation } from "./entities/Player";
import { isDev } from "./utils";
import { renderPlayerNames, createTextCanvasContext } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/game/ChatBox";
import { GameObjectDebugData, lerp, Point, SETTINGS } from "webgl-test-shared";
import { createEntityShaders, renderGameObjects } from "./rendering/game-object-rendering";
import Client from "./client/Client";
import { calculateCursorWorldPosition, getCursorX, getCursorY, getMouseTargetEntity, handleMouseMovement, renderCursorTooltip } from "./mouse";
import { updateDevEntityViewer } from "./components/game/nerd-vision/EntityViewer";
import { createShaderStrings, createWebGLContext, createWebGLProgram, gl, resizeCanvas } from "./webgl";
import { loadTextures } from "./textures";
import { hidePauseScreen, showPauseScreen, toggleSettingsMenu } from "./components/game/GameScreen";
import { getGameState } from "./components/App";
import Item from "./items/Item";
import { createPlaceableItemProgram, renderGhostPlaceableItem } from "./items/PlaceableItem";
import { clearPressedKeys } from "./keyboard-input";
import { createHitboxShaders, renderEntityHitboxes } from "./rendering/hitbox-rendering";
import { updateInteractInventory, updatePlayerMovement } from "./player-input";
import DefiniteGameState from "./game-state/definite-game-state";
import LatencyGameState from "./game-state/latency-game-state";
import { clearServerTicks, updateDebugScreenCurrentTime, updateDebugScreenFPS, updateDebugScreenTicks } from "./components/game/nerd-vision/GameInfoDisplay";
import { createWorldBorderShaders, renderWorldBorder } from "./rendering/world-border-rendering";
import { createRenderChunkBuffers, createSolidTileShaders, renderSolidTiles } from "./rendering/tile-rendering/solid-tile-rendering";
import { createWaterShaders, renderLiquidTiles } from "./rendering/tile-rendering/water-rendering";
import { createChunkBorderShaders, renderChunkBorders } from "./rendering/chunk-border-rendering";
import { nerdVisionIsVisible } from "./components/game/nerd-vision/NerdVision";
import { setFrameProgress } from "./GameObject";
import { createDebugDataShaders, renderLineDebugData, renderTriangleDebugData } from "./rendering/debug-data-rendering";
import { createAmbientOcclusionShaders, recalculateAmbientOcclusion, renderAmbientOcclusion } from "./rendering/ambient-occlusion-rendering";
import { createWallBorderShaders, renderWallBorders } from "./rendering/wall-border-rendering";
import { createParticleShaders, renderParticles } from "./rendering/particle-rendering";
import { ParticleRenderLayer } from "./Particle";
import Tribe from "./Tribe";

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

   public static _ticks: number;
   public static _time: number;

   public static board: Board;
   
   public static isRunning: boolean = false;
   private static isPaused: boolean = false;

   /** If the game has recevied up-to-date game data from the server. Set to false when paused */
   public static isSynced: boolean = true;

   public static hasInitialised = false;

   public static lastTime = 0;
   /** Amount of time the game is through the current frame */
   private static lag = 0;

   public static cursorPosition: Point | null;

   private static nightProgram: WebGLProgram;
   private static nightBuffer: WebGLBuffer;
   private static nightProgramVertPosAttribLocation: GLint;
   private static nightProgramDarkenFactorUniformLocation: WebGLUniformLocation;

   public static definiteGameState = new DefiniteGameState();
   public static latencyGameState = new LatencyGameState();

   private static gameObjectDebugData: GameObjectDebugData | null = null;

   public static tribe: Tribe | null = null;

   public static get ticks(): number {
      return this._ticks;
   }

   public static set ticks(ticks: number) {
      this._ticks = ticks;
      updateDebugScreenTicks(ticks);
   }

   public static get time(): number {
      return this._time;
   }

   public static set time(time: number) {
      this._time = time;
      updateDebugScreenCurrentTime(time);
   }

   public static setGameObjectDebugData(gameObjectDebugData: GameObjectDebugData | undefined): void {
      if (typeof gameObjectDebugData === "undefined") {
         this.gameObjectDebugData = null;
      } else {
         this.gameObjectDebugData = gameObjectDebugData;
      }
   }

   public static getGameObjectDebugData(): GameObjectDebugData | null {
      return this.gameObjectDebugData || null;
   }

   /** Starts the game */
   public static start(): void {
      this.nightProgram = createWebGLProgram(nightVertexShaderText, nightFragmentShaderText, "a_vertPosition");
      this.nightProgramVertPosAttribLocation = gl.getAttribLocation(this.nightProgram, "a_vertPosition");
      this.nightProgramDarkenFactorUniformLocation = gl.getUniformLocation(this.nightProgram, "u_darkenFactor")!;
      this.createNightBuffer();

      createEventListeners();
      resizeCanvas();

      // Set the player's initial rotation
      const cursorX = getCursorX();
      const cursorY = getCursorY();
      if (cursorX !== null && cursorY !== null) {
         updatePlayerRotation(cursorX, cursorY);
      }
               
      // Start the game loop
      this.isSynced = true;
      this.isRunning = true;
      requestAnimationFrame(time => this.main(time));
   }

   public static stop(): void {
      this.isRunning = false;
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

      clearPressedKeys();

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
   public static async initialise(): Promise<void> {
      if (!Game.hasInitialised) {
         return new Promise(async resolve => {
            createWebGLContext();
            createShaderStrings();
            createTextCanvasContext();
            
            createSolidTileShaders();
            createWaterShaders();
            createEntityShaders();
            createWorldBorderShaders();
            createPlaceableItemProgram();
            createChunkBorderShaders();
            createHitboxShaders();
            createDebugDataShaders();

            createParticleShaders();
            createWallBorderShaders();
            createAmbientOcclusionShaders();
            createRenderChunkBuffers();

            recalculateAmbientOcclusion();
            
            await loadTextures();
   
            this.hasInitialised = true;
   
            resolve();
         });
      } else {
         createRenderChunkBuffers();
         recalculateAmbientOcclusion();
      }
   }

   private static update(): void {
      updateSpamFilter();

      updatePlayerMovement();
      tickPlayerInstanceTimeSinceHit();
      updateAvailableCraftingRecipes();

      this.tickPlayerItems();

      Item.decrementGlobalItemSwitchDelay();

      this.board.updateGameObjects();
      if (Player.instance !== null) {
         Player.resolveCollisions();
      }

      if (isDev()) updateDevEntityViewer();
   }

   private static tickPlayerItems(): void {
      if (Game.definiteGameState.hotbar === null) {
         return;
      }
      
      for (const item of Object.values(Game.definiteGameState.hotbar.itemSlots)) {
         if (typeof item.tick !== "undefined") {
            item.tick();
         }
      }
   }

   /**
    * 
    * @param frameProgress How far the game is into the current frame (0 = frame just started, 0.99 means frame is about to end)
    */
   private static render(frameProgress: number): void {
      // Player rotation is updated each render, but only sent each update
      const cursorX = getCursorX();
      const cursorY = getCursorY();
      if (cursorX !== null && cursorY !== null) {
         updatePlayerRotation(cursorX, cursorY);
      }
      
      const currentRenderTime = Math.floor(new Date().getTime() / 1000);
      numRenders++;
      if (currentRenderTime !== lastRenderTime) {
         updateDebugScreenFPS(numRenders);
         clearServerTicks();
         numRenders = 0;
      }
      lastRenderTime = currentRenderTime;

      // Clear the canvas
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      setFrameProgress(frameProgress);

      // Update the camera
      if (Player.instance !== null) {
         Player.instance.updateRenderPosition();
         Camera.setCameraPosition(Player.instance.renderPosition);
         Camera.updateVisibleChunkBounds();
      }

      renderPlayerNames();

      renderSolidTiles();
      renderLiquidTiles();
      // renderAmbientOcclusion();
      // renderWallBorders();
      if (nerdVisionIsVisible() && this.gameObjectDebugData !== null && Game.board.gameObjects.hasOwnProperty(this.gameObjectDebugData.gameObjectID)) {
         renderTriangleDebugData(this.gameObjectDebugData);
      }
      renderWorldBorder();
      if (nerdVisionIsVisible()) {
         renderChunkBorders();
      }

      renderParticles(ParticleRenderLayer.low);

      renderGameObjects(Object.values(this.board.droppedItems));
      renderGameObjects(Object.values(this.board.entities));
      renderGameObjects(Object.values(this.board.projectiles));

      renderParticles(ParticleRenderLayer.high);

      if (nerdVisionIsVisible()) {
         renderEntityHitboxes();
      }
      if (nerdVisionIsVisible() && this.gameObjectDebugData !== null && Game.board.gameObjects.hasOwnProperty(this.gameObjectDebugData.gameObjectID)) {
         renderLineDebugData(this.gameObjectDebugData);
      }

      if (isDev() && nerdVisionIsVisible()) {
         const targettedEntity = getMouseTargetEntity();
         Client.sendTrackGameObject(targettedEntity !== null ? targettedEntity.id : null);
      }

      renderGhostPlaceableItem();

      this.cursorPosition = calculateCursorWorldPosition();
      renderCursorTooltip();

      this.renderNight();

      updateInteractInventory();
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