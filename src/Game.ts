import Board from "./Board";
import Player, { updateAvailableCraftingRecipes, updatePlayerRotation } from "./entities/Player";
import { isDev } from "./utils";
import { createTextCanvasContext, updateTextNumbers, renderText } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/game/ChatBox";
import { DecorationInfo, GameDataPacket, GameObjectDebugData, GrassTileInfo, RiverSteppingStoneData, Settings, ServerTileData, WaterRockData } from "webgl-test-shared";
import { createEntityShaders, renderGameObjects } from "./rendering/game-object-rendering";
import Client from "./client/Client";
import { calculateCursorWorldPositionX, calculateCursorWorldPositionY, cursorX, cursorY, getMouseTargetEntity, handleMouseMovement, renderCursorTooltip } from "./mouse";
import { refreshDebugInfo, setDebugInfoDebugData } from "./components/game/dev/DebugInfo";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, TIME_UNIFORM_BUFFER_BINDING_INDEX, createWebGLContext, gl, halfWindowHeight, halfWindowWidth, resizeCanvas } from "./webgl";
import { loadTextures } from "./textures";
import { hidePauseScreen, showPauseScreen, toggleSettingsMenu } from "./components/game/GameScreen";
import { getGameState } from "./components/App";
import { clearPressedKeys } from "./keyboard-input";
import { createHitboxShaders, renderEntityHitboxes } from "./rendering/hitbox-rendering";
import { updatePlayerItems, updatePlayerMovement } from "./player-input";
import { clearServerTicks, updateDebugScreenFPS, updateDebugScreenRenderTime } from "./components/game/dev/GameInfoDisplay";
import { createWorldBorderShaders, renderWorldBorder } from "./rendering/world-border-rendering";
import { createSolidTileShaders, renderSolidTiles } from "./rendering/solid-tile-rendering";
import { createRiverShaders, createRiverSteppingStoneData, renderRivers } from "./rendering/river-rendering";
import { createChunkBorderShaders, renderChunkBorders } from "./rendering/chunk-border-rendering";
import { nerdVisionIsVisible } from "./components/game/dev/NerdVision";
import { setFrameProgress } from "./GameObject";
import { createDebugDataShaders, renderLineDebugData, renderTriangleDebugData } from "./rendering/debug-data-rendering";
import { createAmbientOcclusionShaders, renderAmbientOcclusion } from "./rendering/ambient-occlusion-rendering";
import { createWallBorderShaders, renderWallBorders } from "./rendering/wall-border-rendering";
import { ParticleRenderLayer, createParticleShaders, renderMonocolourParticles, renderTexturedParticles } from "./rendering/particle-rendering";
import Tribe from "./Tribe";
import OPTIONS from "./options";
import { RENDER_CHUNK_SIZE, createRenderChunks } from "./rendering/render-chunks";
import { registerFrame, updateFrameGraph } from "./components/game/dev/FrameGraph";
import { createNightShaders, renderNight } from "./rendering/night-rendering";
import { createPlaceableItemProgram, renderGhostPlaceableItem } from "./rendering/placeable-item-rendering";
import { setupFrameGraph } from "./rendering/frame-graph-rendering";
import { createEntityTextureAtlas } from "./texture-atlases/entity-texture-atlas";
import { createFishShaders } from "./rendering/fish-rendering";
import { Tile } from "./Tile";
import { createForcefieldShaders, renderForcefield } from "./rendering/world-border-forcefield-rendering";
import { createDecorationShaders, renderDecorations } from "./rendering/decoration-rendering";
import { playRiverSounds, setupAudio, updateSoundEffectVolume } from "./sound";
import { createTechTreeShaders, renderTechTree } from "./rendering/tech-tree-rendering";
import { createResearchOrbShaders, renderResearchOrb } from "./rendering/research-orb-rendering";
import { attemptToResearch, updateActiveResearchBench, updateResearchOrb } from "./research";
import { updateHighlightedAndHoveredEntities, updateSelectedStructure } from "./entity-selection";
import { createStructureHighlightShaders, renderStructureHighlights } from "./rendering/entity-highlight-rendering";
import { updateBlueprintMenu } from "./components/game/BlueprintMenu";
import { InventorySelector_forceUpdate } from "./components/game/inventories/InventorySelector";
import { createTurretRangeShaders, renderTurretRange } from "./rendering/turret-range-rendering";

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
   private static lastTime = 0;

   private static numSkippablePackets = 0;
   
   public static queuedPackets = new Array<GameDataPacket>();
   
   public static isRunning = false;
   private static isPaused = false;

   /** If the game has recevied up-to-date game data from the server. Set to false when paused */
   // @Cleanup: We might be able to remove this whole system by just always sending player data. But do we want to do that???
   public static isSynced = true;

   public static hasInitialised = false;

   /** Amount of time the game is through the current frame */
   private static lag = 0;

   // @Cleanup: Make these not be able to be null, just number
   public static cursorPositionX: number | null = null;
   public static cursorPositionY: number | null = null;

   private static gameObjectDebugData: GameObjectDebugData | null = null;

   public static tribe: Tribe;
   
   private static cameraData = new Float32Array(8);
   private static cameraBuffer: WebGLBuffer;

   private static timeData = new Float32Array(4);
   private static timeBuffer: WebGLBuffer;

   public static setGameObjectDebugData(gameObjectDebugData: GameObjectDebugData | undefined): void {
      if (typeof gameObjectDebugData === "undefined") {
         this.gameObjectDebugData = null;
         setDebugInfoDebugData(null);
      } else {
         this.gameObjectDebugData = gameObjectDebugData;
         setDebugInfoDebugData(gameObjectDebugData);
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
      if (cursorX !== null && cursorY !== null) {
         updatePlayerRotation(cursorX, cursorY);
      }
               
      // Start the game loop
      this.isSynced = true;
      this.isRunning = true;
      this.lastTime = performance.now();
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
   public static async initialise(tiles: Array<Array<Tile>>, waterRocks: ReadonlyArray<WaterRockData>, riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>, riverFlowDirections: Record<number, Record<number, number>>, edgeTiles: Array<ServerTileData>, edgeRiverFlowDirections: Record<number, Record<number, number>>, edgeRiverSteppingStones: ReadonlyArray<RiverSteppingStoneData>, grassInfo: Record<number, Record<number, GrassTileInfo>>, decorations: ReadonlyArray<DecorationInfo>): Promise<void> {
      if (!Game.hasInitialised) {
         return new Promise(async resolve => {
            createWebGLContext();
            createTextCanvasContext();

            Board.initialise(tiles, riverFlowDirections, edgeTiles, edgeRiverFlowDirections, grassInfo);
            Board.addRiverSteppingStonesToChunks(riverSteppingStones);
         
            createRiverSteppingStoneData(riverSteppingStones);

            // Create the camera uniform buffer
            this.cameraBuffer = gl.createBuffer()!;
            gl.bindBufferBase(gl.UNIFORM_BUFFER, CAMERA_UNIFORM_BUFFER_BINDING_INDEX, this.cameraBuffer);
            gl.bufferData(gl.UNIFORM_BUFFER, this.cameraData.byteLength, gl.DYNAMIC_DRAW);

            // Create the time uniform buffer
            this.timeBuffer = gl.createBuffer()!;
            gl.bindBufferBase(gl.UNIFORM_BUFFER, TIME_UNIFORM_BUFFER_BINDING_INDEX, this.timeBuffer);
            gl.bufferData(gl.UNIFORM_BUFFER, this.timeData.byteLength, gl.DYNAMIC_DRAW);
            
            // We load the textures before we create the shaders because some shader initialisations stitch textures together
            await loadTextures();
            await createEntityTextureAtlas();
            
            // Create shaders
            createSolidTileShaders();
            createRiverShaders();
            createFishShaders();
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
            createForcefieldShaders();
            createDecorationShaders();
            createTechTreeShaders();
            createResearchOrbShaders();
            createStructureHighlightShaders();
            createTurretRangeShaders();

            await setupAudio();

            if (isDev()) {
               setupFrameGraph();
            }

            createRenderChunks(decorations, waterRocks, edgeRiverSteppingStones);

            this.hasInitialised = true;
   
            resolve();
         });
      } else {
         Board.initialise(tiles, riverFlowDirections, edgeTiles, edgeRiverFlowDirections, grassInfo);
         Board.addRiverSteppingStonesToChunks(riverSteppingStones);

         createRenderChunks(decorations, waterRocks, edgeRiverSteppingStones);
      }
   }

   public static main(currentTime: number): void {
      if (this.isSynced) {
         const deltaTime = currentTime - Game.lastTime;
         Game.lastTime = currentTime;
      
         this.lag += deltaTime;
         while (this.lag >= 1000 / Settings.TPS) {
            if (this.queuedPackets.length > 0) {
               // Done before so that server data can override particles
               Board.updateParticles();
               
               // If there is a backlog of packets and none are able to be skipped, skip to the final packet
               if (this.numSkippablePackets === 0 && this.queuedPackets.length >= 2) {
                  // Unload all the packets so that things like hits taken aren't skipped
                  for (let i = 0; i < this.queuedPackets.length; i++) {
                     Client.processGameDataPacket(this.queuedPackets[i]);
                  }
                  this.queuedPackets.splice(0, this.queuedPackets.length);
               } else {
                  Client.processGameDataPacket(this.queuedPackets[0]);
                  this.queuedPackets.splice(0, 1);
                  this.numSkippablePackets--;
                  
                  if (this.queuedPackets.length === 0 || this.numSkippablePackets < 0) {
                     this.numSkippablePackets = 0;
                  }
               }

               updateTextNumbers();
               Board.updateTickCallbacks();
               Board.tickGameObjects();
               this.update();
               this.updatePlayer();
            } else {
               this.numSkippablePackets++;
               
               updateTextNumbers();
               Board.updateTickCallbacks();
               Board.updateParticles();
               Board.updateGameObjects();
               this.update();
            }
            Client.sendPlayerDataPacket();
            this.lag -= 1000 / Settings.TPS;
         }

         const renderStartTime = performance.now();

         const frameProgress = this.lag / 1000 * Settings.TPS;
         this.render(frameProgress);

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

   private static update(): void {
      updateSpamFilter();

      updatePlayerMovement();
      updateAvailableCraftingRecipes();
      
      updatePlayerItems();
      updateActiveResearchBench();
      updateResearchOrb();
      attemptToResearch();

      updateHighlightedAndHoveredEntities();
      updateSelectedStructure();
      updateBlueprintMenu();
      InventorySelector_forceUpdate();

      updateSoundEffectVolume();
      playRiverSounds();

      this.cursorPositionX = calculateCursorWorldPositionX();
      this.cursorPositionY = calculateCursorWorldPositionY();
      renderCursorTooltip();

      if (isDev()) refreshDebugInfo();
   }

   private static updatePlayer(): void {
      if (Player.instance !== null) {
         Player.instance.tick();
         Player.instance.update();

         // @Cleanup: Should be done in the game object update function
         Player.resolveCollisions();
      }
   }

   /**
    * 
    * @param frameProgress How far the game is into the current frame (0 = frame just started, 0.99 means frame is about to end)
    */
   private static render(frameProgress: number): void {
      // Player rotation is updated each render, but only sent each update
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
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      setFrameProgress(frameProgress);

      // Update the camera
      if (Player.instance !== null) {
         Player.instance.updateRenderPosition();
         Camera.setCameraPosition(Player.instance.renderPosition);
         Camera.updateVisibleChunkBounds();
         Camera.updateVisibleRenderChunkBounds();
      }

      // Update the camera buffer
      gl.bindBuffer(gl.UNIFORM_BUFFER, this.cameraBuffer);
      this.cameraData[0] = Camera.position.x;
      this.cameraData[1] = Camera.position.y;
      this.cameraData[2] = halfWindowWidth;
      this.cameraData[3] = halfWindowHeight;
      this.cameraData[4] = Camera.zoom;
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.cameraData);

      // Update the time buffer
      gl.bindBuffer(gl.UNIFORM_BUFFER, this.timeBuffer);
      this.timeData[0] = performance.now();
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.timeData);

      renderText();

      renderSolidTiles();
      renderRivers();
      renderDecorations();
      renderTurretRange();
      renderAmbientOcclusion();
      renderWallBorders();
      if (nerdVisionIsVisible() && this.gameObjectDebugData !== null && Board.hasEntityID(this.gameObjectDebugData.gameObjectID)) {
         renderTriangleDebugData(this.gameObjectDebugData);
      }
      renderForcefield();
      renderWorldBorder();
      if (nerdVisionIsVisible() && OPTIONS.showChunkBorders) {
         renderChunkBorders(Camera.minVisibleChunkX, Camera.maxVisibleChunkX, Camera.minVisibleChunkY, Camera.maxVisibleChunkY, Settings.CHUNK_SIZE, 1);
      }
      if (nerdVisionIsVisible() && OPTIONS.showRenderChunkBorders) {
         renderChunkBorders(Camera.minVisibleRenderChunkX, Camera.maxVisibleRenderChunkX, Camera.minVisibleRenderChunkY, Camera.maxVisibleRenderChunkY, RENDER_CHUNK_SIZE, 2);
      }

      if (OPTIONS.showParticles) {
         renderMonocolourParticles(ParticleRenderLayer.low);
         renderTexturedParticles(ParticleRenderLayer.low);
      }

      renderGameObjects();

      renderStructureHighlights();
      
      if (OPTIONS.showParticles) {
         renderMonocolourParticles(ParticleRenderLayer.high);
         renderTexturedParticles(ParticleRenderLayer.high);
      }

      renderResearchOrb();

      if (nerdVisionIsVisible() && OPTIONS.showHitboxes) {
         renderEntityHitboxes();
      }
      if (nerdVisionIsVisible() && this.gameObjectDebugData !== null && Board.hasEntityID(this.gameObjectDebugData.gameObjectID)) {
         renderLineDebugData(this.gameObjectDebugData);
      }

      if (isDev()) {
         if (nerdVisionIsVisible()) {
            const targettedEntity = getMouseTargetEntity();
            Client.sendTrackGameObject(targettedEntity !== null ? targettedEntity.id : null);
         } else {
            Client.sendTrackGameObject(null);
         }
      }

      renderGhostPlaceableItem();
      
      renderNight();

      updateDebugScreenFPS();
      
      renderTechTree();
   }
}

export default Game;