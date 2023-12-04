import { DecorationInfo, RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneData, SETTINGS, ServerTileUpdateData, WaterRockData } from "webgl-test-shared";
import { createSolidTileRenderChunkData, recalculateSolidTileRenderChunkData } from "./solid-tile-rendering";
import { calculateRiverRenderChunkData } from "./river-rendering";
import { calculateAmbientOcclusionInfo } from "./ambient-occlusion-rendering";
import { calculateWallBorderInfo } from "./wall-border-rendering";
import Board from "../Board";

/** Width and height of a render chunk in tiles */
export const RENDER_CHUNK_SIZE = 8;
export const RENDER_CHUNK_UNITS = RENDER_CHUNK_SIZE * SETTINGS.TILE_SIZE;

export const WORLD_RENDER_CHUNK_SIZE = SETTINGS.BOARD_DIMENSIONS / RENDER_CHUNK_SIZE;

export const RENDER_CHUNK_EDGE_GENERATION = Math.ceil(SETTINGS.EDGE_GENERATION_DISTANCE / RENDER_CHUNK_SIZE);

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

/** Stores rendering information about one render chunk of the world.*/
export interface RenderChunk {
   readonly solidTileInfo: RenderChunkSolidTileInfo;
   readonly riverInfo: RenderChunkRiverInfo | null;
   readonly ambientOcclusionInfo: RenderChunkAmbientOcclusionInfo | null;
   readonly wallBorderInfo: RenderChunkWallBorderInfo | null;
   decorations: Array<DecorationInfo>;
}

// @Speed: Convert to 1d array
let renderChunks: Array<Array<RenderChunk>>;

export function createRenderChunks(): void {
   // Group water rocks
   // @Speed: Garbage collection
   let waterRocksChunked: Record<number, Record<number, Array<WaterRockData>>> = {};
   for (const waterRock of Board.waterRocks) {
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
   for (const steppingStone of Board.edgeRiverSteppingStones) {
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

   renderChunks = new Array<Array<RenderChunk>>();
   for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
      renderChunks.push(new Array<RenderChunk>());

      for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
         const waterRocks = (waterRocksChunked.hasOwnProperty(renderChunkX) && waterRocksChunked[renderChunkX].hasOwnProperty(renderChunkY)) ? waterRocksChunked[renderChunkX][renderChunkY] : [];
         const edgeSteppingStones = (edgeSteppingStonesChunked.hasOwnProperty(renderChunkX) && edgeSteppingStonesChunked[renderChunkX].hasOwnProperty(renderChunkY)) ? edgeSteppingStonesChunked[renderChunkX][renderChunkY] : [];

         // @Cleanup: Mismatching 'create' and 'calculate' in the function names
         // @Incomplete @Bug: This structure tries to access itself in calculateRiverRenderChunkData
         // restructure so that this doesn't happen
         renderChunks[renderChunkX + RENDER_CHUNK_EDGE_GENERATION].push({
            solidTileInfo: createSolidTileRenderChunkData(renderChunkX, renderChunkY),
            riverInfo: calculateRiverRenderChunkData(renderChunkX, renderChunkY, waterRocks, edgeSteppingStones),
            ambientOcclusionInfo: calculateAmbientOcclusionInfo(renderChunkX, renderChunkY),
            wallBorderInfo: calculateWallBorderInfo(renderChunkX, renderChunkY),
            decorations: []
         });
      }
   }

   // Add decorations to chunks
   for (const decoration of Board.decorations) {
      const renderChunkX = Math.floor(decoration.positionX / RENDER_CHUNK_UNITS);
      const renderChunkY = Math.floor(decoration.positionY / RENDER_CHUNK_UNITS);
      if (renderChunkX >= 0 && renderChunkX < WORLD_RENDER_CHUNK_SIZE && renderChunkY >= 0 && renderChunkY < WORLD_RENDER_CHUNK_SIZE) {
         const renderChunk = renderChunks[renderChunkX + RENDER_CHUNK_EDGE_GENERATION][renderChunkY + RENDER_CHUNK_EDGE_GENERATION];
         renderChunk.decorations.push(decoration);
      }
   }
}

export function updateRenderChunkFromTileUpdate(tileUpdate: ServerTileUpdateData): void {
   const tileX = tileUpdate.tileIndex % SETTINGS.BOARD_DIMENSIONS;
   const tileY = Math.floor(tileUpdate.tileIndex / SETTINGS.BOARD_DIMENSIONS);
   
   const renderChunkX = Math.floor(tileX / RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(tileY / RENDER_CHUNK_SIZE);

   recalculateSolidTileRenderChunkData(renderChunkX, renderChunkY);
}

export function getRenderChunk(renderChunkX: number, renderChunkY: number): RenderChunk {
   return renderChunks[renderChunkX + RENDER_CHUNK_EDGE_GENERATION][renderChunkY + RENDER_CHUNK_EDGE_GENERATION]
}