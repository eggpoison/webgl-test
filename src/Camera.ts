import { SETTINGS, VisibleChunkBounds } from "webgl-test-shared";
import { windowHeight, windowWidth } from ".";
import Player from "./entities/Player";
import TransformComponent from "./entity-components/TransformComponent";
import { Point } from "./utils";

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
      this.visibleChunkBounds = this.calculateVisibleChunkBounds();
   }

   public static getVisibleChunkBounds(): [number, number, number, number] {
      return this.visibleChunkBounds;
   }

   public static chunkIsVisible(x: number, y: number): boolean {
      return x >= this.visibleChunkBounds[0] && x <= this.visibleChunkBounds[1] && y >= this.visibleChunkBounds[2] && y <= this.visibleChunkBounds[3];
   }

   public static updateCameraPosition(frameProgress: number): void {
      const playerTransformComponent = Player.instance.getComponent(TransformComponent)!;

      // Predict where the player is
      const previousFramePlayerPos = playerTransformComponent.position;

      let predictedPlayerPos: Point;
      if (playerTransformComponent.velocity === null) {
         predictedPlayerPos = previousFramePlayerPos;
      } else {
         const playerVelocity = playerTransformComponent.velocity.copy();
         playerVelocity.magnitude *= frameProgress / SETTINGS.TPS;

         predictedPlayerPos = previousFramePlayerPos.add(playerVelocity.convertToPoint());
      }

      this.position = new Point(predictedPlayerPos.x, predictedPlayerPos.y);
      // this.position = new Point(previousFramePlayerPos.x, previousFramePlayerPos.y);
   }

   public static getXPositionInScreen(x: number): number {
      // Account for the player position
      const worldX = x - this.position.x + window.innerWidth / 2;

      const canvasX = worldX / window.innerWidth * 2 - 1;
      return canvasX;
   }
   
   public static getYPositionInScreen(y: number): number {
      // Account for the player position
      const worldY = y - this.position.y + window.innerHeight / 2;
      
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