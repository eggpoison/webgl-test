import { Point, SETTINGS, VisibleChunkBounds } from "webgl-test-shared";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import { RENDER_CHUNK_EDGE_GENERATION, RENDER_CHUNK_SIZE, WORLD_RENDER_CHUNK_SIZE } from "./rendering/render-chunks";

export type VisiblePositionBounds = [minX: number, maxX: number, minY: number, maxY: number];

abstract class Camera {
   /** Larger = zoomed in, smaller = zoomed out */
   public static zoom: number = 1.75;

   public static position: Point;
   
   public static minVisibleChunkX = -1;
   public static maxVisibleChunkX = -1;
   public static minVisibleChunkY = -1;
   public static maxVisibleChunkY = -1;

   public static minVisibleRenderChunkX = -1;
   public static maxVisibleRenderChunkX = -1;
   public static minVisibleRenderChunkY = -1;
   public static maxVisibleRenderChunkY = -1;

   public static updateVisibleChunkBounds(): void {
      this.minVisibleChunkX = Math.max(Math.floor((this.position.x - halfWindowWidth / this.zoom) / SETTINGS.CHUNK_UNITS), 0);
      this.maxVisibleChunkX = Math.min(Math.floor((this.position.x + halfWindowWidth / this.zoom) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1);
      this.minVisibleChunkY = Math.max(Math.floor((this.position.y - halfWindowHeight / this.zoom) / SETTINGS.CHUNK_UNITS), 0);
      this.maxVisibleChunkY = Math.min(Math.floor((this.position.y + halfWindowHeight / this.zoom) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1);
   }

   public static getVisibleChunkBounds(): VisibleChunkBounds {
      return [this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY];
   }

   public static updateVisibleRenderChunkBounds(): void {
      const unitsInChunk = SETTINGS.TILE_SIZE * RENDER_CHUNK_SIZE;
      
      this.minVisibleRenderChunkX = Math.max(Math.floor((this.position.x - halfWindowWidth / this.zoom) / unitsInChunk), -RENDER_CHUNK_EDGE_GENERATION);
      this.maxVisibleRenderChunkX = Math.min(Math.floor((this.position.x + halfWindowWidth / this.zoom) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
      this.minVisibleRenderChunkY = Math.max(Math.floor((this.position.y - halfWindowHeight / this.zoom) / unitsInChunk), -RENDER_CHUNK_EDGE_GENERATION);
      this.maxVisibleRenderChunkY = Math.min(Math.floor((this.position.y + halfWindowHeight / this.zoom) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
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

export default Camera;