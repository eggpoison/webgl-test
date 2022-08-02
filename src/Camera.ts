import { SETTINGS } from "webgl-test-shared";
import { windowHeight, windowWidth } from ".";
import Player from "./entities/Player";
import TransformComponent from "./entity-components/TransformComponent";
import { Point } from "./utils";

abstract class Camera {
   /** Larger = zoomed in, smaller = zoomed out */
   public static zoom: number = 1;

   public static position: Point;

   private static readonly visibleChunkBounds: [number, number, number, number] = [0, 0, 0, 0];

   public static updateVisibleChunkBounds(): void {
      const unitsInChunk = SETTINGS.TILE_SIZE * SETTINGS.CHUNK_SIZE;

      // minX
      this.visibleChunkBounds[0] = Math.max(Math.floor((this.position.x - windowWidth / 2) / unitsInChunk), 0);
      // maxX
      this.visibleChunkBounds[1] = Math.min(Math.floor((this.position.x + windowWidth / 2) / unitsInChunk), SETTINGS.BOARD_SIZE - 1);
      // minY
      this.visibleChunkBounds[2] = Math.max(Math.floor((this.position.y - windowHeight / 2) / unitsInChunk), 0);
      // maxY
      this.visibleChunkBounds[3] = Math.min(Math.floor((this.position.y + windowHeight / 2) / unitsInChunk), SETTINGS.BOARD_SIZE - 1);
   }

   public static getVisibleChunkBounds(): [number, number, number, number] {
      return this.visibleChunkBounds;
   }

   public static chunkIsVisible(x: number, y: number): boolean {
      return x >= this.visibleChunkBounds[0] && x <= this.visibleChunkBounds[1] && y >= this.visibleChunkBounds[2] && y <= this.visibleChunkBounds[3];
   }

   public static updateCameraPosition(): void {
      const followedEntityPoistion = Player.instance.getComponent(TransformComponent)!.position;
      this.position = new Point(followedEntityPoistion.x, followedEntityPoistion.y);
   }

   public static getXPositionInScreen(x: number, canvasType: "game" | "text"): number {
      // Account for the player position
      const worldX = x - this.position.x + window.innerWidth / 2;
      if (canvasType === "text") return worldX;

      const canvasX = worldX / window.innerWidth * 2 - 1;
      return canvasX;
   }
   
   public static getYPositionInScreen(y: number, canvasType: "game" | "text"): number {
      // Account for the player position
      const worldY = y - this.position.y + window.innerHeight / 2;
      if (canvasType === "text") return -worldY + window.innerHeight;
      
      const canvasY = worldY / window.innerHeight * 2 - 1;
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