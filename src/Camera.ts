import { Point, SETTINGS, VisibleChunkBounds } from "webgl-test-shared";
import { halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from ".";
import Client from "./client/Client";
import Player from "./entities/Player";

abstract class Camera {
   /** Larger = zoomed in, smaller = zoomed out */
   public static zoom: number = 1;

   public static position: Point;

   private static visibleChunkBounds: VisibleChunkBounds = [0, 0, 0, 0];

   public static calculateVisibleChunkBounds(): VisibleChunkBounds {
      const unitsInChunk = SETTINGS.TILE_SIZE * SETTINGS.CHUNK_SIZE;

      const minX = Math.max(Math.floor((this.position.x - windowWidth / 2) / unitsInChunk), 0);
      const maxX = Math.min(Math.floor((this.position.x + windowWidth / 2) / unitsInChunk), SETTINGS.BOARD_SIZE - 1);
      const minY = Math.max(Math.floor((this.position.y - windowHeight / 2) / unitsInChunk), 0);
      const maxY = Math.min(Math.floor((this.position.y + windowHeight / 2) / unitsInChunk), SETTINGS.BOARD_SIZE - 1);

      return [minX, maxX, minY, maxY];
   }

   public static updateVisibleChunkBounds(): void {
      const newVisibleChunkBounds = this.calculateVisibleChunkBounds();

      // If the visible chunk bounds have changed, send them to the server
      if (!newVisibleChunkBounds.every((value: number, idx: number) => value === this.visibleChunkBounds[idx])) {
         Client.sendVisibleChunkBoundsPacket(newVisibleChunkBounds);
      }

      this.visibleChunkBounds = newVisibleChunkBounds;
   }

   public static getVisibleChunkBounds(): VisibleChunkBounds {
      return this.visibleChunkBounds;
   }

   public static updateCameraPosition(): void {
      // Predict where the player is
      this.position = Player.instance.renderPosition.copy();
   }

   public static getXPositionInScreen(x: number): number {
      // Account for the player position
      const worldX = x - this.position.x + halfWindowWidth;

      const canvasX = worldX / windowWidth * 2 - 1;
      return canvasX;
   }
   
   public static getYPositionInScreen(y: number): number {
      // Account for the player position
      const worldY = y - this.position.y + halfWindowHeight;
      
      const canvasY = worldY / windowHeight * 2 - 1;
      return canvasY;
   }

   public static pointIsVisible(point: Point): boolean {
      const unitsInChunk = SETTINGS.TILE_SIZE * SETTINGS.CHUNK_SIZE;

      const pointChunkX = Math.floor(point.x / unitsInChunk);
      const pointChunkY = Math.floor(point.y / unitsInChunk);

      return pointChunkX >= this.visibleChunkBounds[0] && pointChunkX <= this.visibleChunkBounds[1] && pointChunkY >= this.visibleChunkBounds[2] && pointChunkY <= this.visibleChunkBounds[3];
   }
}

export default Camera;