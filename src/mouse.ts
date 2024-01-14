import { BowItemInfo, ITEM_INFO_RECORD, SETTINGS, TribeMemberAction } from "webgl-test-shared";
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
import { getSecondsSinceLastAction } from "./entities/TribeMember";

export let cursorX: number | null = null;
export let cursorY: number | null = null;

export function calculateCursorWorldPositionX(): number | null {
   if (Game.getIsPaused() || cursorX === null) return null;
   
   const worldX = (cursorX - halfWindowWidth) / Camera.zoom + Camera.position.x;
   if (worldX < 0 || worldX >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE) {
      return null;
   }
   return worldX;
}

export function calculateCursorWorldPositionY(): number | null {
   if (Game.getIsPaused() || cursorY === null) return null;
   
   const worldY = (-cursorY + halfWindowHeight) / Camera.zoom + Camera.position.y;
   if (worldY < 0 || worldY >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE) {
      return null;
   }
   return worldY;
}

export function handleMouseMovement(e: MouseEvent): void {
   cursorX = e.clientX;
   cursorY = e.clientY;
}

/**
 * Finds the entity the user is hovering over.
 */
export function getMouseTargetTile(): Tile | null {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) return null;

   const tileX = Math.floor(Game.cursorPositionX / SETTINGS.TILE_SIZE);
   const tileY = Math.floor(Game.cursorPositionY / SETTINGS.TILE_SIZE);

   if (Board.tileIsInBoard(tileX, tileY)) {
      return Board.getTile(tileX, tileY);
   }
   return null;
}

/**
 * Finds the entity the user is hovering over.
 */
export function getMouseTargetEntity(): Entity | null {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) return null;
   
   const minChunkX = Math.max(Math.min(Math.floor((Game.cursorPositionX - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((Game.cursorPositionX + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((Game.cursorPositionY - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((Game.cursorPositionY + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

   let closestEntity: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const gameObject of chunk.getGameObjects()) {
            if (gameObject instanceof Entity) {
               const distance = Math.sqrt(Math.pow(Game.cursorPositionX - gameObject.renderPosition.x, 2) + Math.pow(Game.cursorPositionY - gameObject.renderPosition.y, 2))
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

// @Cleanup: Function name. This doesn't just render the cursor tooltip, it updates debug info.
// Maybe seperate this into two functions?
export function renderCursorTooltip(): void {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) {
      updateCursorTooltip(null, -1, -1);
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
      updateCursorTooltip(null, -1, -1);
      if (isDev()) {
         updateDebugInfoEntity(null);
      }
      return;
   } else {
      updateDebugInfoEntity(targetEntity);
   }

   // Update the cursor tooltip
   const entityScreenPositionX = Camera.calculateXScreenPos(targetEntity.renderPosition.x);
   const entityScreenPositionY = Camera.calculateYScreenPos(targetEntity.renderPosition.y);

   const debugData = Game.getGameObjectDebugData();
   if (debugData === null || targetEntity.id === debugData.gameObjectID) {
      updateCursorTooltip(debugData, entityScreenPositionX, entityScreenPositionY);
   }
}

export function updateChargeMeter(): void {
   if (latencyGameState.mainAction !== TribeMemberAction.chargeBow || Player.instance === null) {
      hideChargeMeter();
      return;
   }

   showChargeMeter();

   const selectedItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   const bowInfo = ITEM_INFO_RECORD[selectedItem.type] as BowItemInfo;

   const secondsSinceLastAction = getSecondsSinceLastAction(Player.instance.rightLastActionTicks);
   let chargeProgress = secondsSinceLastAction / (bowInfo.shotCooldownTicks / SETTINGS.TPS);
   if (chargeProgress > 1) {
      chargeProgress = 1;
   }

   updateChargeMeterProgress(chargeProgress);
}