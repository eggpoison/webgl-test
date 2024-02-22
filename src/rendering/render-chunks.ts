import { DecorationInfo, RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneData, SettingsConst, ServerTileUpdateData, WaterRockData } from "webgl-test-shared";
import { createSolidTileRenderChunkData, recalculateSolidTileRenderChunkData } from "./solid-tile-rendering";
import { calculateRiverRenderChunkData } from "./river-rendering";
import { calculateAmbientOcclusionInfo } from "./ambient-occlusion-rendering";
import { calculateWallBorderInfo } from "./wall-border-rendering";

/** Width and height of a render chunk in tiles */
export const RENDER_CHUNK_SIZE = 8;
export const RENDER_CHUNK_UNITS = RENDER_CHUNK_SIZE * SettingsConst.TILE_SIZE;

export const WORLD_RENDER_CHUNK_SIZE = SettingsConst.BOARD_DIMENSIONS / RENDER_CHUNK_SIZE;

export const RENDER_CHUNK_EDGE_GENERATION = Math.ceil(SettingsConst.EDGE_GENERATION_DISTANCE / RENDER_CHUNK_SIZE);

export interface RenderChunkSolidTileInfo {
   readonly buffer: WebGLBuffer;
   vao: WebGLVertexArrayObject;
   vertexCount: number;
}

export interface RenderChunkRiverInfo {
   readonly baseVAO: WebGLVertexArrayObject;
   readonly baseVertexCount: number;
   readonly rockVAO: WebGLVertexArrayObject;
   readonly rockVertexCount: number;
   readonly highlightsVAO: WebGLVertexArrayObject;
   readonly highlightsVertexCount: number;
   readonly noiseVAO: WebGLVertexArrayObject;
   readonly noiseVertexCount: number;
   readonly transitionVAO: WebGLVertexArrayObject;
   readonly transitionVertexCount: number;
   /** IDs of all stepping stone groups resent in the render chunk */
   readonly riverSteppingStoneGroupIDs: ReadonlyArray<number>;
   readonly waterRocks: Array<WaterRockData>;
}

export interface RenderChunkAmbientOcclusionInfo {
   readonly vao: WebGLVertexArrayObject;
   readonly vertexCount: number;
}

export interface RenderChunkWallBorderInfo {
   readonly vao: WebGLVertexArrayObject;
   readonly vertexCount: number;
}

export interface RenderChunkDecorationInfo {
   readonly decorations: Array<DecorationInfo>;
}

let solidTileInfoArray: Array<RenderChunkSolidTileInfo>;
// @Speed: Polymorphism
let riverInfoArray: Array<RenderChunkRiverInfo | null>;
// @Speed: Polymorphism
let ambientOcclusionInfoArray: Array<RenderChunkAmbientOcclusionInfo | null>;
let wallBorderInfoArray: Array<RenderChunkWallBorderInfo>;
let decorationInfoArray: Array<RenderChunkDecorationInfo>;

export function getRenderChunkIndex(renderChunkX: number, renderChunkY: number): number {
   const x = renderChunkX + RENDER_CHUNK_EDGE_GENERATION;
   const y = renderChunkY + RENDER_CHUNK_EDGE_GENERATION;
   return y * (WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION * 2) + x;
}

export function getRenderChunkDecorationInfo(renderChunkX: number, renderChunkY: number): RenderChunkDecorationInfo {
   return decorationInfoArray[getRenderChunkIndex(renderChunkX, renderChunkY)];
}

export function getRenderChunkRiverInfo(renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo | null {
   return riverInfoArray[getRenderChunkIndex(renderChunkX, renderChunkY)];
}

export function getRenderChunkSolidTileInfo(renderChunkX: number, renderChunkY: number): RenderChunkSolidTileInfo {
   return solidTileInfoArray[getRenderChunkIndex(renderChunkX, renderChunkY)];
}

export function getRenderChunkWallBorderInfo(renderChunkX: number, renderChunkY: number): RenderChunkWallBorderInfo {
   return wallBorderInfoArray[getRenderChunkIndex(renderChunkX, renderChunkY)];
}

export function getRenderChunkAmbientOcclusionInfo(renderChunkX: number, renderChunkY: number): RenderChunkAmbientOcclusionInfo | null {
   return ambientOcclusionInfoArray[getRenderChunkIndex(renderChunkX, renderChunkY)];
}

export function createRenderChunks(decorations: ReadonlyArray<DecorationInfo>, waterRocks: ReadonlyArray<WaterRockData>, edgeRiverSteppingStones: ReadonlyArray<RiverSteppingStoneData>): void {
   // Group water rocks
   // @Speed: Garbage collection
   let waterRocksChunked: Record<number, Record<number, Array<WaterRockData>>> = {};
   for (const waterRock of waterRocks) {
      const renderChunkX = Math.floor(waterRock.position[0] / RENDER_CHUNK_UNITS);
      const renderChunkY = Math.floor(waterRock.position[1] / RENDER_CHUNK_UNITS);
      if (!waterRocksChunked.hasOwnProperty(renderChunkX)) {
         waterRocksChunked[renderChunkX] = {};
      }
      if (!waterRocksChunked[renderChunkX].hasOwnProperty(renderChunkY)) {
         waterRocksChunked[renderChunkX][renderChunkY] = [];
      }
      waterRocksChunked[renderChunkX][renderChunkY].push(waterRock);
   }

   // Group edge stepping stones
   let edgeSteppingStonesChunked: Record<number, Record<number, Array<RiverSteppingStoneData>>> = {};
   for (const steppingStone of edgeRiverSteppingStones) {
      const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
      
      const minRenderChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX - size/2) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE - 1), 0);
      const maxRenderChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX + size/2) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE - 1), 0);
      const minRenderChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY - size/2) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE - 1), 0);
      const maxRenderChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY + size/2) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE - 1), 0);
      
      for (let renderChunkX = minRenderChunkX; renderChunkX <= maxRenderChunkX; renderChunkX++) {
         for (let renderChunkY = minRenderChunkY; renderChunkY <= maxRenderChunkY; renderChunkY++) {
            if (!edgeSteppingStonesChunked.hasOwnProperty(renderChunkX)) {
               edgeSteppingStonesChunked[renderChunkX] = {};
            }
            if (!edgeSteppingStonesChunked[renderChunkX].hasOwnProperty(renderChunkY)) {
               edgeSteppingStonesChunked[renderChunkX][renderChunkY] = [];
            }
            if (!edgeSteppingStonesChunked[renderChunkX][renderChunkY].includes(steppingStone)) {
               edgeSteppingStonesChunked[renderChunkX][renderChunkY].push(steppingStone);
            }
         }
      }
   }

   // Solid tile info
   solidTileInfoArray = [];
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         const data = createSolidTileRenderChunkData(renderChunkX, renderChunkY);
         solidTileInfoArray.push(data);
      }
   }

   // River info
   riverInfoArray = [];
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         const waterRocks = (waterRocksChunked.hasOwnProperty(renderChunkX) && waterRocksChunked[renderChunkX].hasOwnProperty(renderChunkY)) ? waterRocksChunked[renderChunkX][renderChunkY] : [];
         const edgeSteppingStones = (edgeSteppingStonesChunked.hasOwnProperty(renderChunkX) && edgeSteppingStonesChunked[renderChunkX].hasOwnProperty(renderChunkY)) ? edgeSteppingStonesChunked[renderChunkX][renderChunkY] : [];

         const data = calculateRiverRenderChunkData(renderChunkX, renderChunkY, waterRocks, edgeSteppingStones);
         riverInfoArray.push(data);
      }
   }

   // Ambient occlusion info
   ambientOcclusionInfoArray = [];
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         const data = calculateAmbientOcclusionInfo(renderChunkX, renderChunkY);
         ambientOcclusionInfoArray.push(data);
      }
   }

   // Wall border info
   wallBorderInfoArray = [];
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         const data = calculateWallBorderInfo(renderChunkX, renderChunkY);
         wallBorderInfoArray.push(data);
      }
   }

   // Decoration info
   decorationInfoArray = [];
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         decorationInfoArray.push({ decorations: [] });
      }
   }

   // Add decorations to chunks
   for (let i = 0; i < decorations.length; i++) {
      const decoration = decorations[i];

      const renderChunkX = Math.floor(decoration.positionX / RENDER_CHUNK_UNITS);
      const renderChunkY = Math.floor(decoration.positionY / RENDER_CHUNK_UNITS);
      const renderChunkIndex = getRenderChunkIndex(renderChunkX, renderChunkY);
      decorationInfoArray[renderChunkIndex].decorations.push(decoration);
   }
}

export function updateRenderChunkFromTileUpdate(tileUpdate: ServerTileUpdateData): void {
   const tileX = tileUpdate.tileIndex % SettingsConst.BOARD_DIMENSIONS;
   const tileY = Math.floor(tileUpdate.tileIndex / SettingsConst.BOARD_DIMENSIONS);
   
   const renderChunkX = Math.floor(tileX / RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(tileY / RENDER_CHUNK_SIZE);

   recalculateSolidTileRenderChunkData(renderChunkX, renderChunkY);
}

export function getRenderChunkMinTileX(renderChunkX: number): number {
   let tileMinX = renderChunkX * RENDER_CHUNK_SIZE;
   if (tileMinX < -SettingsConst.EDGE_GENERATION_DISTANCE) {
      tileMinX = SettingsConst.EDGE_GENERATION_DISTANCE;
   }
   return tileMinX;
}

export function getRenderChunkMaxTileX(renderChunkX: number): number {
   let tileMaxX = (renderChunkX + 1) * RENDER_CHUNK_SIZE - 1;
   if (tileMaxX > SettingsConst.BOARD_DIMENSIONS + SettingsConst.EDGE_GENERATION_DISTANCE) {
      tileMaxX = SettingsConst.BOARD_DIMENSIONS + SettingsConst.EDGE_GENERATION_DISTANCE;
   }
   return tileMaxX;
}

export function getRenderChunkMinTileY(renderChunkY: number): number {
   let tileMinY = renderChunkY * RENDER_CHUNK_SIZE;
   if (tileMinY < -SettingsConst.EDGE_GENERATION_DISTANCE) {
      tileMinY = SettingsConst.EDGE_GENERATION_DISTANCE;
   }
   return tileMinY;
}

export function getRenderChunkMaxTileY(renderChunkY: number): number {
   let tileMaxY = (renderChunkY + 1) * RENDER_CHUNK_SIZE - 1;
   if (tileMaxY > SettingsConst.BOARD_DIMENSIONS + SettingsConst.EDGE_GENERATION_DISTANCE) {
      tileMaxY = SettingsConst.BOARD_DIMENSIONS + SettingsConst.EDGE_GENERATION_DISTANCE;
   }
   return tileMaxY;
}