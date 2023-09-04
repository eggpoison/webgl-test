import { SETTINGS, ServerTileUpdateData } from "webgl-test-shared";
import { createSolidTileRenderChunkData, recalculateSolidTileRenderChunkData } from "./solid-tile-rendering";
import { calculateRiverRenderChunkData } from "./river-rendering";

/** Width and height of a render chunk in tiles */
export const RENDER_CHUNK_SIZE = 8;

export const WORLD_RENDER_CHUNK_SIZE = SETTINGS.BOARD_DIMENSIONS / RENDER_CHUNK_SIZE;

export interface RenderChunkSolidTileInfo {
   vaos: Array<WebGLVertexArrayObject>;
   vertexCounts: Array<number>;
   indexedTextureSources: Array<string>;
}

export interface RenderChunkRiverInfo {
   readonly baseVAO: WebGLVertexArrayObject;
   readonly baseVertexCount: number;
   readonly rockVAOs: ReadonlyArray<WebGLVertexArrayObject>;
   readonly rockVertexCounts: ReadonlyArray<number>;
   readonly highlightsVAO: WebGLVertexArrayObject;
   readonly highlightsVertexCount: number;
   readonly noiseVAO: WebGLVertexArrayObject;
   readonly noiseVertexCount: number;
   readonly transitionVAO: WebGLVertexArrayObject;
   readonly transitionVertexCount: number;
   readonly foamVAO: WebGLVertexArrayObject;
   readonly foamVertexCount: number;
   readonly steppingStoneVAO: WebGLVertexArrayObject;
   readonly steppingStoneVertexCount: number;
}

/** Stores rendering information about one render chunk of the world.*/
export interface RenderChunk {
   solidTileInfo: RenderChunkSolidTileInfo;
   riverInfo: RenderChunkRiverInfo | null;
}

let renderChunks: Array<Array<RenderChunk>>;

export function createRenderChunks(): void {
   renderChunks = new Array<Array<RenderChunk>>();
   
   for (let renderChunkX = 0; renderChunkX < WORLD_RENDER_CHUNK_SIZE; renderChunkX++) {
      renderChunks.push(new Array<RenderChunk>());

      for (let renderChunkY = 0; renderChunkY < WORLD_RENDER_CHUNK_SIZE; renderChunkY++) {
         const solidTileInfo = createSolidTileRenderChunkData(renderChunkX, renderChunkY);
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

   recalculateSolidTileRenderChunkData(renderChunkX, renderChunkY, renderChunks[renderChunkX][renderChunkY].solidTileInfo);
}

export function getRenderChunkSolidTileInfo(renderChunkX: number, renderChunkY: number): RenderChunkSolidTileInfo {
   return renderChunks[renderChunkX][renderChunkY].solidTileInfo;
}

export function getRenderChunkRiverInfo(renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo | null {
   return renderChunks[renderChunkX][renderChunkY].riverInfo;
}