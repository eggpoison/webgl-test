import { Point, SETTINGS } from "webgl-test-shared";
import { halfWindowHeight, halfWindowWidth } from ".";
import Board from "./Board";
import Camera from "./Camera";
import CLIENT_SETTINGS from "./client-settings";
import { updateCursorTooltipTarget } from "./components/CursorTooltip";
import Entity from "./entities/Entity";
import Player from "./entities/Player";
import Game from "./Game";

let cursorX: number;
let cursorY: number;

export function calculateCursorWorldPosition(): Point | null {
   if (Game.isPaused) return null;
   if (typeof cursorX === "undefined" || typeof cursorY === "undefined") return null;

   const worldX = cursorX - halfWindowWidth + Player.instance.renderPosition.x;
   const worldY = -cursorY + halfWindowHeight + Player.instance.renderPosition.y;

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
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getEntities()) {
            if (entity === Player.instance) continue;

            const distance = cursorPosition.distanceFrom(entity.position);
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