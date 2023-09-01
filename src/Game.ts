import Board from "./Board";
import Player, { tickPlayerInstanceTimeSinceHit, updateAvailableCraftingRecipes, updatePlayerRotation } from "./entities/Player";
import { isDev } from "./utils";
import { renderPlayerNames, createTextCanvasContext } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/game/ChatBox";
import { GameDataPacket, GameObjectDebugData, Point, SETTINGS } from "webgl-test-shared";
import { createEntityShaders, renderGameObjects } from "./rendering/game-object-rendering";
import Client from "./client/Client";
import { calculateCursorWorldPosition, getCursorX, getCursorY, getMouseTargetEntity, handleMouseMovement, renderCursorTooltip } from "./mouse";
import { updateDevEntityViewer } from "./components/game/dev/EntityViewer";
import { createShaderStrings, createWebGLContext, gl, resizeCanvas } from "./webgl";
import { loadTextures } from "./textures";
import { hidePauseScreen, showPauseScreen, toggleSettingsMenu } from "./components/game/GameScreen";
import { getGameState } from "./components/App";
import Item from "./items/Item";
import { clearPressedKeys } from "./keyboard-input";
import { createHitboxShaders, renderEntityHitboxes } from "./rendering/hitbox-rendering";
import { updateInteractInventory, updatePlayerMovement } from "./player-input";
import DefiniteGameState from "./game-state/definite-game-state";
import LatencyGameState from "./game-state/latency-game-state";
import { clearServerTicks, updateDebugScreenCurrentTime, updateDebugScreenFPS, updateDebugScreenRenderTime } from "./components/game/dev/GameInfoDisplay";
import { createWorldBorderShaders, renderWorldBorder } from "./rendering/world-border-rendering";
import { createSolidTileShaders, renderSolidTiles } from "./rendering/tile-rendering/solid-tile-rendering";
import { createWaterShaders, renderRivers } from "./rendering/tile-rendering/river-rendering";
import { createChunkBorderShaders, renderChunkBorders } from "./rendering/chunk-border-rendering";
import { nerdVisionIsVisible } from "./components/game/dev/NerdVision";
import { setFrameProgress } from "./GameObject";
import { createDebugDataShaders, renderLineDebugData, renderTriangleDebugData } from "./rendering/debug-data-rendering";
import { createAmbientOcclusionShaders, recalculateAmbientOcclusion, renderAmbientOcclusion } from "./rendering/ambient-occlusion-rendering";
import { createWallBorderShaders, renderWallBorders } from "./rendering/wall-border-rendering";
import { createParticleShaders, renderParticles } from "./rendering/particle-rendering";
import { ParticleRenderLayer } from "./Particle";
import Tribe from "./Tribe";
import OPTIONS from "./options";
import { createRenderChunks } from "./rendering/tile-rendering/render-chunks";
import { generateFoodEatingParticleColours } from "./food-eating-particles";
import { registerFrame, updateFrameGraph } from "./components/game/dev/FrameGraph";
import { createNightShaders, renderNight } from "./rendering/night-rendering";
import { createPlaceableItemProgram, renderGhostPlaceableItem } from "./rendering/placeable-item-rendering";

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

abstract class Game {
   public static queuedPackets = new Array<GameDataPacket>();
   
   public static ticks: number;
   private static _time: number;

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

   public static definiteGameState = new DefiniteGameState();
   public static latencyGameState = new LatencyGameState();

   private static gameObjectDebugData: GameObjectDebugData | null = null;

   public static tribe: Tribe | null = null;

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
            createNightShaders();

            createParticleShaders();
            createWallBorderShaders();
            createAmbientOcclusionShaders();
            createRenderChunks();

            recalculateAmbientOcclusion();

            generateFoodEatingParticleColours();
            
            await loadTextures();
   
            this.hasInitialised = true;
   
            resolve();
         });
      } else {
         createRenderChunks();
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

      if (isDev()) updateDevEntityViewer();
   }

   private static updatePlayer(): void {
      if (Player.instance !== null) {
         Player.instance.applyPhysics();
         Player.instance.updateHitboxes();
         Player.instance.recalculateContainingChunks();
         Player.resolveCollisions();
      }
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
      if (currentRenderTime !== lastRenderTime) {
         clearServerTicks();
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
         Camera.updateVisiblePositionBounds();
      }

      renderPlayerNames();

      renderSolidTiles();
      renderRivers();
      // renderAmbientOcclusion();
      // renderWallBorders();
      if (nerdVisionIsVisible() && this.gameObjectDebugData !== null && Game.board.gameObjects.hasOwnProperty(this.gameObjectDebugData.gameObjectID)) {
         renderTriangleDebugData(this.gameObjectDebugData);
      }
      renderWorldBorder();
      if (nerdVisionIsVisible() && OPTIONS.showChunkBorders) {
         renderChunkBorders();
      }

      renderParticles(Object.values(this.board.lowParticles));

      renderGameObjects(Object.values(this.board.droppedItems));
      renderGameObjects(Object.values(this.board.entities));
      renderGameObjects(Object.values(this.board.projectiles));

      renderParticles(Object.values(this.board.highParticles));

      if (nerdVisionIsVisible() && OPTIONS.showHitboxes) {
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

      if (!OPTIONS.nightVisionIsEnabled) {
         renderNight();
      }

      updateInteractInventory();

      updateDebugScreenFPS();
   }

   // private static bb: GameDataPacket | null = null;

   // public static b(gameDataPacket: GameDataPacket): void {
   //    this.bb = gameDataPacket;
   //    // this.update();
   //    // Client.sendPlayerDataPacket();
   //    // while (this.lag >= 1000 / SETTINGS.TPS) {
   //    //    this.lag -= 1000 / SETTINGS.TPS;
   //    // }
   //    // // this.lag = 0;
   //    // const frameProgress = this.lag / 1000 * SETTINGS.TPS;
   //    // console.log("update " + frameProgress);
   // }

   public static main(currentTime: number): void {
      if (this.isSynced) {
         const deltaTime = currentTime - this.lastTime;
         this.lastTime = currentTime;
      
         // updateFrameCounter(deltaTime / 1000);

         this.lag += deltaTime;
         while (this.lag >= 1000 / SETTINGS.TPS) {
            if (this.queuedPackets.length > 0) {
               // If there are multiple packets in the queue, register the first one first.
               Client.unloadGameDataPacket(this.queuedPackets[0]);
               this.queuedPackets.splice(0, 1);
               this.update();
               this.updatePlayer();
            } else {
               console.log("No packets!");
               this.update();
               this.board.updateGameObjects();
            }
            Client.sendPlayerDataPacket();
            this.lag -= 1000 / SETTINGS.TPS;
         }

         const renderStartTime = performance.now();

         const frameProgress = this.lag / 1000 * SETTINGS.TPS;
         this.render(frameProgress);
         // console.log("render. frame progress: " + frameProgress);

         const renderEndTime = performance.now();

         const renderTime = renderEndTime - renderStartTime;
         registerFrame(renderStartTime, renderEndTime);
         updateFrameGraph();
         updateDebugScreenRenderTime(renderTime);
      }

      if (this.isRunning) {
         requestAnimationFrame(time => this.main(time));
      }
   }
}

export default Game;