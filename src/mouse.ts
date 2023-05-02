import { Point, SETTINGS } from "webgl-test-shared";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import CLIENT_SETTINGS from "./client-settings";
import { updateCursorTooltipTarget } from "./components/CursorTooltip";
import Entity from "./entities/Entity";
import Game from "./Game";
import Camera from "./Camera";

let cursorX: number | null = null;
let cursorY: number | null = null;

export function getCursorX(): number | null {
   return cursorX;
}

export function getCursorY(): number | null {
   return cursorY;
}

export function calculateCursorWorldPosition(): Point | null {
   if (Game.getIsPaused()) return null;
   if (cursorX === null || cursorY === null) return null;

   const worldX = cursorX - halfWindowWidth + Camera.position.x;
   const worldY = -cursorY + halfWindowHeight + Camera.position.y;

   // If out of bounds return null;
   if (worldX < 0 || worldX >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE || worldY < 0 || worldY >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE) {
      return null;
   }

   return new Point(worldX, worldY);
}

export function handleMouseMovement(e: MouseEvent): void {
   cursorX = e.clientX;
   cursorY = e.clientY;
}

const calculateCursorTooltipTargetEntity = (cursorPosition: Point): Entity | null => {
   const minChunkX = Math.max(Math.min(Math.floor((cursorPosition.x - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((cursorPosition.x + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((cursorPosition.y - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((cursorPosition.y + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

   let closestEntity: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Game.board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getEntities()) {
            const distance = cursorPosition.calculateDistanceBetween(entity.renderPosition);
            if (distance <= CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE && distance < minDistance) {
               closestEntity = entity;
               minDistance = distance;
            }
         }
      }
   }

   return closestEntity;
}

const calculateEntityScreenPosition = (entity: Entity): Point => {
   const x = entity.renderPosition.x - Camera.position.x + halfWindowWidth;
   const y = -entity.renderPosition.y + Camera.position.y + halfWindowHeight;

   return new Point(x, y);
}

export function renderCursorTooltip(): void {
   if (typeof Game.cursorPosition === "undefined") return;

   if (Game.cursorPosition === null) {
      updateCursorTooltipTarget(null, null);
      return;
   }
 
   const targetEntity = calculateCursorTooltipTargetEntity(Game.cursorPosition);

   // If there is no target, hide the tooltip
   if (targetEntity === null) {
      updateCursorTooltipTarget(null, null);
      return;
   }

   // Update the cursor tooltip
   const screenPosition = calculateEntityScreenPosition(targetEntity);
   updateCursorTooltipTarget(targetEntity, screenPosition);
}