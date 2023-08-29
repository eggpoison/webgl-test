import { Point, SETTINGS, VisibleChunkBounds } from "webgl-test-shared";
import { halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "./webgl";
import { RENDER_CHUNK_SIZE, WORLD_RENDER_CHUNK_SIZE } from "./rendering/tile-rendering/render-chunks";

export type VisiblePositionBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class Camera {
   /** Larger = zoomed in, smaller = zoomed out */
   public static readonly zoom: number = 1.4;

   public static position: Point;

   private static visibleChunkBounds: VisibleChunkBounds = [-1, -1, -1, -1];

   public static visiblePositionBounds: VisiblePositionBounds = [-1, -1, -1, -1];

   public static updateVisibleChunkBounds(): void {
      const unitsInChunk = SETTINGS.TILE_SIZE * SETTINGS.CHUNK_SIZE;

      // minX
      this.visibleChunkBounds[0] = Math.max(Math.floor((this.position.x - halfWindowWidth) / unitsInChunk), 0);
      // maxX
      this.visibleChunkBounds[1] = Math.min(Math.floor((this.position.x + halfWindowWidth) / unitsInChunk), SETTINGS.BOARD_SIZE - 1);
      // minY
      this.visibleChunkBounds[2] = Math.max(Math.floor((this.position.y - halfWindowHeight) / unitsInChunk), 0);
      // maxY
      this.visibleChunkBounds[3] = Math.min(Math.floor((this.position.y + halfWindowHeight) / unitsInChunk), SETTINGS.BOARD_SIZE - 1);
   }

   public static updateVisiblePositionBounds(): void {
      this.visiblePositionBounds[0] = this.position.x - halfWindowWidth;
      this.visiblePositionBounds[1] = this.position.x + halfWindowWidth;
      this.visiblePositionBounds[2] = this.position.y - halfWindowHeight;
      this.visiblePositionBounds[3] = this.position.y + halfWindowHeight;
   }

   public static getVisibleChunkBounds(): VisibleChunkBounds {
      return this.visibleChunkBounds;
   }

   public static calculateVisibleRenderChunkBounds(): VisibleChunkBounds {
      const unitsInChunk = SETTINGS.TILE_SIZE * RENDER_CHUNK_SIZE;

      const minX = Math.max(Math.floor((this.position.x - windowWidth / 2) / unitsInChunk), 0);
      const maxX = Math.min(Math.floor((this.position.x + windowWidth / 2) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE - 1);
      const minY = Math.max(Math.floor((this.position.y - windowHeight / 2) / unitsInChunk), 0);
      const maxY = Math.min(Math.floor((this.position.y + windowHeight / 2) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE - 1);

      return [minX, maxX, minY, maxY];
   }

   public static setCameraPosition(position: Point): void {
      this.position = position;
   }

   /** X position in the screen (0 = left, windowWidth = right) */
   public static calculateXScreenPos(x: number): number {
      // Account for the player position
      const playerRelativePosition = x - this.position.x;
      
      // Account for zoom
      return playerRelativePosition * this.zoom + halfWindowWidth;
   }

   /** Y position in the screen (0 = bottom, windowHeight = top) */
   public static calculateYScreenPos(y: number): number {
      // Account for the player position
      const playerRelativePosition = y - this.position.y;
      
      // Account for zoom
      return playerRelativePosition * this.zoom + halfWindowHeight;
   }

   public static calculateXCanvasPosition(x: number): number {
      const screenX = this.calculateXScreenPos(x);

      const canvasX = screenX / windowWidth * 2 - 1;
      return canvasX;
   }
   
   public static calculateYCanvasPosition(y: number): number {
      // Account for the player position
      const screenY = this.calculateYScreenPos(y);
      
      const canvasY = screenY / windowHeight * 2 - 1;
      return canvasY;
   }

   public static pointIsVisible(point: Point): boolean {
      const unitsInChunk = SETTINGS.TILE_SIZE * SETTINGS.CHUNK_SIZE;

      const pointChunkX = Math.floor(point.x / unitsInChunk);
      const pointChunkY = Math.floor(point.y / unitsInChunk);

      return pointChunkX >= this.visibleChunkBounds[0] && pointChunkX <= this.visibleChunkBounds[1] && pointChunkY >= this.visibleChunkBounds[2] && pointChunkY <= this.visibleChunkBounds[3];
   }

   public static calculateVisibleTileBounds(): [minTileX: number, maxTileX: number, minTileY: number, maxTileY: number] {
      const minX = Math.max(Math.floor((this.position.x - windowWidth / 2) / SETTINGS.TILE_SIZE), 0);
      const maxX = Math.min(Math.ceil((this.position.x + windowWidth / 2) / SETTINGS.TILE_SIZE), SETTINGS.BOARD_DIMENSIONS - 1);
      const minY = Math.max(Math.floor((this.position.y - windowHeight / 2) / SETTINGS.TILE_SIZE), 0);
      const maxY = Math.min(Math.ceil((this.position.y + windowHeight / 2) / SETTINGS.TILE_SIZE), SETTINGS.BOARD_DIMENSIONS - 1);
      return [minX, maxX, minY, maxY];
   }
}

document.documentElement.style.setProperty("--zoom", Camera.zoom.toString());

export default Camera;