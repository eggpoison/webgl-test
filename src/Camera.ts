import { Point, SETTINGS, VisibleChunkBounds } from "webgl-test-shared";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import { RENDER_CHUNK_SIZE, WORLD_RENDER_CHUNK_SIZE } from "./rendering/tile-rendering/render-chunks";

export type VisiblePositionBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class Camera {
   /** Larger = zoomed in, smaller = zoomed out */
   public static zoom: number = 1.4;

   public static position: Point;

   // @Speed expand these into 4 variables each
   
   public static visibleChunkBounds: VisibleChunkBounds = [-1, -1, -1, -1];

   public static visibleRenderChunkBounds: VisibleChunkBounds = [-1, -1, -1, -1];

   public static visiblePositionBounds: VisiblePositionBounds = [-1, -1, -1, -1];

   public static updateVisibleChunkBounds(): void {
      const unitsInChunk = SETTINGS.TILE_SIZE * SETTINGS.CHUNK_SIZE;

      // minX
      this.visibleChunkBounds[0] = Math.max(Math.floor((this.position.x - halfWindowWidth / this.zoom) / unitsInChunk), 0);
      // maxX
      this.visibleChunkBounds[1] = Math.min(Math.floor((this.position.x + halfWindowWidth / this.zoom) / unitsInChunk), SETTINGS.BOARD_SIZE - 1);
      // minY
      this.visibleChunkBounds[2] = Math.max(Math.floor((this.position.y - halfWindowHeight / this.zoom) / unitsInChunk), 0);
      // maxY
      this.visibleChunkBounds[3] = Math.min(Math.floor((this.position.y + halfWindowHeight / this.zoom) / unitsInChunk), SETTINGS.BOARD_SIZE - 1);
   }

   public static updateVisiblePositionBounds(): void {
      this.visiblePositionBounds[0] = this.position.x - halfWindowWidth / this.zoom;
      this.visiblePositionBounds[1] = this.position.x + halfWindowWidth / this.zoom;
      this.visiblePositionBounds[2] = this.position.y - halfWindowHeight / this.zoom;
      this.visiblePositionBounds[3] = this.position.y + halfWindowHeight / this.zoom;
   }

   public static getVisibleChunkBounds(): VisibleChunkBounds {
      return this.visibleChunkBounds;
   }

   public static updateVisibleRenderChunkBounds(): void {
      const unitsInChunk = SETTINGS.TILE_SIZE * RENDER_CHUNK_SIZE;

      this.visibleRenderChunkBounds[0] = Math.max(Math.floor((this.position.x - halfWindowWidth / this.zoom) / unitsInChunk), 0);
      this.visibleRenderChunkBounds[1] = Math.min(Math.floor((this.position.x + halfWindowWidth / this.zoom) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE - 1);
      this.visibleRenderChunkBounds[2] = Math.max(Math.floor((this.position.y - halfWindowHeight / this.zoom) / unitsInChunk), 0);
      this.visibleRenderChunkBounds[3] = Math.min(Math.floor((this.position.y + halfWindowHeight / this.zoom) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE - 1);
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
}

// @Cleanup: This shouldn't exist.
document.documentElement.style.setProperty("--zoom", Camera.zoom.toString());

export default Camera;