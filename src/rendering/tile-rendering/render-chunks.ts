import { DecorationInfo, RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneData, SETTINGS, ServerTileUpdateData, WaterRockData } from "webgl-test-shared";
import { createSolidTileRenderChunkData, recalculateSolidTileRenderChunkData } from "./solid-tile-rendering";
import { calculateRiverRenderChunkData } from "./river-rendering";
import { calculateAmbientOcclusionInfo } from "../ambient-occlusion-rendering";
import { calculateWallBorderInfo } from "../wall-border-rendering";
import Board from "../../Board";

/** Width and height of a render chunk in tiles */
export const RENDER_CHUNK_SIZE = 8;
export const RENDER_CHUNK_UNITS = RENDER_CHUNK_SIZE * SETTINGS.TILE_SIZE;

export const WORLD_RENDER_CHUNK_SIZE = SETTINGS.BOARD_DIMENSIONS / RENDER_CHUNK_SIZE;

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

export interface EdgeRenderChunk {
   readonly solidTileInfo: RenderChunkSolidTileInfo;
   readonly riverInfo: RenderChunkRiverInfo | null;
   readonly ambientOcclusionInfo: RenderChunkAmbientOcclusionInfo | null;
   readonly wallBorderInfo: RenderChunkWallBorderInfo | null;
}

// @Cleanup: Is there a way to unify the board and edge render chunks??

// @Speed: Convert to 1d array
let renderChunks: Array<Array<RenderChunk>>;

let edgeRenderChunks: Record<number, Record<number, EdgeRenderChunk>> = {};

export function createRenderChunks(): void {
   // Group water rocks
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
   for (let renderChunkX = 0; renderChunkX < WORLD_RENDER_CHUNK_SIZE; renderChunkX++) {
      renderChunks.push(new Array<RenderChunk>());

      for (let renderChunkY = 0; renderChunkY < WORLD_RENDER_CHUNK_SIZE; renderChunkY++) {
         const waterRocks = (waterRocksChunked.hasOwnProperty(renderChunkX) && waterRocksChunked[renderChunkX].hasOwnProperty(renderChunkY)) ? waterRocksChunked[renderChunkX][renderChunkY] : [];
         const edgeSteppingStones = (edgeSteppingStonesChunked.hasOwnProperty(renderChunkX) && edgeSteppingStonesChunked[renderChunkX].hasOwnProperty(renderChunkY)) ? edgeSteppingStonesChunked[renderChunkX][renderChunkY] : [];

         // @Cleanup: Mismatching 'create' and 'calculate' in the function names
         // @Incomplete @Bug: This structure tries to access itself in calculateRiverRenderChunkData
         // restructure so that this doesn't happen
         renderChunks[renderChunkX].push({
            solidTileInfo: createSolidTileRenderChunkData(renderChunkX, renderChunkY),
            riverInfo: calculateRiverRenderChunkData(renderChunkX, renderChunkY, waterRocks, edgeSteppingStones),
            ambientOcclusionInfo: calculateAmbientOcclusionInfo(renderChunkX, renderChunkY),
            wallBorderInfo: calculateWallBorderInfo(renderChunkX, renderChunkY),
            decorations: []
         });
      }
   }

   const renderChunkEdgeDistance = Math.ceil(SETTINGS.EDGE_GENERATION_DISTANCE / RENDER_CHUNK_SIZE);
   for (let renderChunkX = -renderChunkEdgeDistance; renderChunkX < WORLD_RENDER_CHUNK_SIZE + renderChunkEdgeDistance; renderChunkX++) {
      for (let renderChunkY = -renderChunkEdgeDistance; renderChunkY < WORLD_RENDER_CHUNK_SIZE + renderChunkEdgeDistance; renderChunkY++) {
         // Skip render chunks in the board
         // @Speed: Whole lot of unnecessary continues
         if (renderChunkX >= 0 && renderChunkX < WORLD_RENDER_CHUNK_SIZE && renderChunkY >= 0 && renderChunkY < WORLD_RENDER_CHUNK_SIZE) {
            continue;
         }

         const waterRocks = (waterRocksChunked.hasOwnProperty(renderChunkX) && waterRocksChunked[renderChunkX].hasOwnProperty(renderChunkY)) ? waterRocksChunked[renderChunkX][renderChunkY] : [];
         const edgeSteppingStones = (edgeSteppingStonesChunked.hasOwnProperty(renderChunkX) && edgeSteppingStonesChunked[renderChunkX].hasOwnProperty(renderChunkY)) ? edgeSteppingStonesChunked[renderChunkX][renderChunkY] : [];
         
         if (!edgeRenderChunks.hasOwnProperty(renderChunkX)) {
            edgeRenderChunks[renderChunkX] = {};
         }
         edgeRenderChunks[renderChunkX][renderChunkY] = {
            solidTileInfo: createSolidTileRenderChunkData(renderChunkX, renderChunkY),
            riverInfo: calculateRiverRenderChunkData(renderChunkX, renderChunkY, waterRocks, edgeSteppingStones),
            ambientOcclusionInfo: calculateAmbientOcclusionInfo(renderChunkX, renderChunkY),
            wallBorderInfo: calculateWallBorderInfo(renderChunkX, renderChunkY)
         };
      }
   }

   // Add decorations to chunks
   for (const decoration of Board.decorations) {
      const renderChunkX = Math.floor(decoration.positionX / RENDER_CHUNK_UNITS);
      const renderChunkY = Math.floor(decoration.positionY / RENDER_CHUNK_UNITS);
      if (renderChunkX >= 0 && renderChunkX < WORLD_RENDER_CHUNK_SIZE && renderChunkY >= 0 && renderChunkY < WORLD_RENDER_CHUNK_SIZE) {
         const renderChunk = renderChunks[renderChunkX][renderChunkY];
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

// @Cleanup: All these functions seem superfluous

export function getRenderChunkSolidTileInfo(renderChunkX: number, renderChunkY: number): RenderChunkSolidTileInfo | null {
   if (renderChunkX >= 0 && renderChunkX < WORLD_RENDER_CHUNK_SIZE && renderChunkY >= 0 && renderChunkY < WORLD_RENDER_CHUNK_SIZE) {
      return renderChunks[renderChunkX][renderChunkY].solidTileInfo;
   } else if (edgeRenderChunks.hasOwnProperty(renderChunkX) && edgeRenderChunks[renderChunkX].hasOwnProperty(renderChunkY)) {
      return edgeRenderChunks[renderChunkX][renderChunkY].solidTileInfo;
   }
   return null;
}

export function getRenderChunkRiverInfo(renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo | null {
   if (renderChunkX >= 0 && renderChunkX < WORLD_RENDER_CHUNK_SIZE && renderChunkY >= 0 && renderChunkY < WORLD_RENDER_CHUNK_SIZE) {
      return renderChunks[renderChunkX][renderChunkY].riverInfo;
   } else if (edgeRenderChunks.hasOwnProperty(renderChunkX) && edgeRenderChunks[renderChunkX].hasOwnProperty(renderChunkY)) {
      return edgeRenderChunks[renderChunkX][renderChunkY].riverInfo;
   }
   return null;
}

export function getRenderChunkAmbientOcclusionInfo(renderChunkX: number, renderChunkY: number): RenderChunkAmbientOcclusionInfo | null {
   if (renderChunkX >= 0 && renderChunkX < WORLD_RENDER_CHUNK_SIZE && renderChunkY >= 0 && renderChunkY < WORLD_RENDER_CHUNK_SIZE) {
      return renderChunks[renderChunkX][renderChunkY].ambientOcclusionInfo;
   } else if (edgeRenderChunks.hasOwnProperty(renderChunkX) && edgeRenderChunks[renderChunkX].hasOwnProperty(renderChunkY)) {
      return edgeRenderChunks[renderChunkX][renderChunkY].ambientOcclusionInfo;
   }
   return null;
}

export function getRenderChunkWallBorderInfo(renderChunkX: number, renderChunkY: number): RenderChunkWallBorderInfo | null {
   if (renderChunkX >= 0 && renderChunkX < WORLD_RENDER_CHUNK_SIZE && renderChunkY >= 0 && renderChunkY < WORLD_RENDER_CHUNK_SIZE) {
      return renderChunks[renderChunkX][renderChunkY].wallBorderInfo;
   } else if (edgeRenderChunks.hasOwnProperty(renderChunkX) && edgeRenderChunks[renderChunkX].hasOwnProperty(renderChunkY)) {
      return edgeRenderChunks[renderChunkX][renderChunkY].wallBorderInfo;
   }
   return null;
}

export function getRenderChunkDecorations(renderChunkX: number, renderChunkY: number): ReadonlyArray<DecorationInfo> {
   return renderChunks[renderChunkX][renderChunkY].decorations;
}

export function getRenderChunkWaterRocks(renderChunkX: number, renderChunkY: number): ReadonlyArray<WaterRockData> {
   console.log(renderChunkX, renderChunkY);
   console.log(renderChunks[renderChunkX][renderChunkY]);
   if (typeof renderChunks[renderChunkX][renderChunkY].riverInfo === "undefined") {
      console.log("BAD.");
   }
   if (renderChunkX >= 0 && renderChunkX < WORLD_RENDER_CHUNK_SIZE && renderChunkY >= 0 && renderChunkY < WORLD_RENDER_CHUNK_SIZE) {
      return renderChunks[renderChunkX][renderChunkY].riverInfo!.waterRocks;
   } else if (edgeRenderChunks.hasOwnProperty(renderChunkX) && edgeRenderChunks[renderChunkX].hasOwnProperty(renderChunkY)) {
      return edgeRenderChunks[renderChunkX][renderChunkY].riverInfo!.waterRocks;
   }
   throw new Error("Out of bounds render chunk x=" + renderChunkX + " y=" + renderChunkY);
}