import { SETTINGS, ServerTileUpdateData } from "webgl-test-shared";
import { calculateSolidTileRenderChunkData } from "./solid-tile-rendering";
import { calculateRiverRenderChunkData } from "./river-rendering";

/** Width and height of a render chunk in tiles */
export const RENDER_CHUNK_SIZE = 8;

export const WORLD_RENDER_CHUNK_SIZE = SETTINGS.BOARD_DIMENSIONS / RENDER_CHUNK_SIZE;

export interface RenderChunkSolidTileInfo {
   readonly buffers: ReadonlyArray<WebGLBuffer>;
   readonly vertexCounts: ReadonlyArray<number>;
   readonly indexedTextureSources: ReadonlyArray<string>;
}

export interface RenderChunkRiverInfo {
   readonly baseBuffer: WebGLBuffer;
   readonly baseVertexCount: number;
   readonly transitionBuffer: WebGLBuffer;
   readonly transitionVertexCount: number;
   readonly rockBuffers: ReadonlyArray<WebGLBuffer>;
   readonly rockVertexCounts: ReadonlyArray<number>;
   readonly highlightsBuffer: WebGLBuffer;
   readonly highlightsVertexCount: number;
   readonly noiseBuffer: WebGLBuffer;
   readonly noiseVertexCount: number;
}

/** Stores rendering information about one render chunk of the world.*/
export interface RenderChunk {
   solidTileInfo: RenderChunkSolidTileInfo;
   riverInfo: RenderChunkRiverInfo;
}

let renderChunks: Array<Array<RenderChunk>>;

export function createRenderChunks(): void {
   renderChunks = new Array<Array<RenderChunk>>();
   
   for (let renderChunkX = 0; renderChunkX < WORLD_RENDER_CHUNK_SIZE; renderChunkX++) {
      renderChunks.push(new Array<RenderChunk>());

      for (let renderChunkY = 0; renderChunkY < WORLD_RENDER_CHUNK_SIZE; renderChunkY++) {
         const solidTileInfo = calculateSolidTileRenderChunkData(renderChunkX, renderChunkY);
         const riverInfo = calculateRiverRenderChunkData(renderChunkX, renderChunkY);

         renderChunks[renderChunkX].push({
            solidTileInfo: solidTileInfo,
            riverInfo: riverInfo
         });
      }
   }
}

export function updateRenderChunkFromTileUpdate(tileUpdate: ServerTileUpdateData): void {
   const renderChunkX = Math.floor(tileUpdate.x / RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(tileUpdate.y / RENDER_CHUNK_SIZE);

   const solidTileInfo = calculateSolidTileRenderChunkData(renderChunkX, renderChunkY);
   renderChunks[renderChunkX][renderChunkY].solidTileInfo = solidTileInfo;
}

export function getRenderChunkSolidTileInfo(renderChunkX: number, renderChunkY: number): RenderChunkSolidTileInfo {
   return renderChunks[renderChunkX][renderChunkY].solidTileInfo;
}

export function getRenderChunkRiverInfo(renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo {
   return renderChunks[renderChunkX][renderChunkY].riverInfo;
}