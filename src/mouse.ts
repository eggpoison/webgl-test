import { BowItemInfo, ITEM_INFO_RECORD, Point, SETTINGS, TribeMemberAction } from "webgl-test-shared";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import CLIENT_SETTINGS from "./client-settings";
import { updateCursorTooltip } from "./components/game/dev/CursorTooltip";
import Entity from "./entities/Entity";
import Game from "./Game";
import Camera from "./Camera";
import { updateDebugInfoEntity, updateDebugInfoTile } from "./components/game/dev/DebugInfo";
import { isDev } from "./utils";
import Board from "./Board";
import { Tile } from "./Tile";
import { definiteGameState, latencyGameState } from "./game-state/game-states";
import { hideChargeMeter, showChargeMeter, updateChargeMeterProgress } from "./components/game/ChargeMeter";
import Player from "./entities/Player";

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
   
   const worldX = (cursorX - halfWindowWidth) / Camera.zoom + Camera.position.x;
   const worldY = (-cursorY + halfWindowHeight) / Camera.zoom + Camera.position.y;

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

/**
 * Finds the entity the user is hovering over.
 */
export function getMouseTargetTile(): Tile | null {
   if (Game.cursorPosition === null) return null;

   const tileX = Math.floor(Game.cursorPosition.x / SETTINGS.TILE_SIZE);
   const tileY = Math.floor(Game.cursorPosition.y / SETTINGS.TILE_SIZE);

   if (Board.tileIsInBoard(tileX, tileY)) {
      return Board.getTile(tileX, tileY);
   }
   return null;
}

/**
 * Finds the entity the user is hovering over.
 */
export function getMouseTargetEntity(): Entity | null {
   if (Game.cursorPosition === null) return null;
   
   const minChunkX = Math.max(Math.min(Math.floor((Game.cursorPosition.x - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((Game.cursorPosition.x + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((Game.cursorPosition.y - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((Game.cursorPosition.y + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

   let closestEntity: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const gameObject of chunk.getGameObjects()) {
            if (gameObject instanceof Entity) {
               const distance = Game.cursorPosition.calculateDistanceBetween(gameObject.renderPosition);
               if (distance <= CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE && distance < minDistance) {
                  closestEntity = gameObject;
                  minDistance = distance;
               }
            }
         }
      }
   }

   return closestEntity;
}

const calculateEntityScreenPosition = (entity: Entity): Point => {
   const x = Camera.calculateXScreenPos(entity.renderPosition.x);
   const y = Camera.calculateYScreenPos(entity.renderPosition.y);
   return new Point(x, y);
}

// @Cleanup: Function name. This doesn't just render the cursor tooltip, it updates debug info.
// Maybe seperate this into two functions?
export function renderCursorTooltip(): void {
   if (typeof Game.cursorPosition === "undefined") return;

   if (Game.cursorPosition === null) {
      updateCursorTooltip(null, null);
      if (isDev()) {
         updateDebugInfoEntity(null);
      }
      return;
   }

   const targetTile = getMouseTargetTile();
   updateDebugInfoTile(targetTile);
 
   const targetEntity = getMouseTargetEntity();

   // If there is no target, hide the tooltip
   if (targetEntity === null) {
      updateCursorTooltip(null, null);
      if (isDev()) {
         updateDebugInfoEntity(null);
      }
      return;
   } else {
      updateDebugInfoEntity(targetEntity);
   }

   // Update the cursor tooltip
   const screenPosition = calculateEntityScreenPosition(targetEntity);

   const debugData = Game.getGameObjectDebugData();
   if (debugData === null || targetEntity.id === debugData.gameObjectID) {
      updateCursorTooltip(debugData, screenPosition);
   }
}

export function updateChargeMeter(): void {
   if (latencyGameState.playerAction !== TribeMemberAction.charge_bow || Player.instance === null) {
      hideChargeMeter();
      return;
   }

   showChargeMeter();

   const selectedItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   const bowInfo = ITEM_INFO_RECORD[selectedItem.type] as BowItemInfo;

   const secondsSinceLastAction = Player.instance.getSecondsSinceLastAction(Player.instance.lastActionTicks);
   let chargeProgress = secondsSinceLastAction / bowInfo.shotCooldown;
   if (chargeProgress > 1) {
      chargeProgress = 1;
   }

   updateChargeMeterProgress(chargeProgress);
}