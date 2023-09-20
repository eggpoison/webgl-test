import { SETTINGS, ServerTileUpdateData } from "webgl-test-shared";
import { createSolidTileRenderChunkData, recalculateSolidTileRenderChunkData } from "./solid-tile-rendering";
import { calculateRiverRenderChunkData } from "./river-rendering";
import { calculateAmbientOcclusionInfo } from "../ambient-occlusion-rendering";

/** Width and height of a render chunk in tiles */
export const RENDER_CHUNK_SIZE = 8;

export const WORLD_RENDER_CHUNK_SIZE = SETTINGS.BOARD_DIMENSIONS / RENDER_CHUNK_SIZE;

export interface RenderChunkSolidTileInfo {
   readonly buffer: WebGLBuffer;
   vao: WebGLVertexArrayObject;
   vertexCount: number;
   texture: WebGLTexture;
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

export interface RenderChunkAmbientOcclusionInfo {
   readonly vao: WebGLVertexArrayObject;
   data: Float32Array;
   readonly vertexCount: number;
}

/** Stores rendering information about one render chunk of the world.*/
export interface RenderChunk {
   solidTileInfo: RenderChunkSolidTileInfo;
   riverInfo: RenderChunkRiverInfo | null;
   ambientOcclusioninfo: RenderChunkAmbientOcclusionInfo | null;
}

let renderChunks: Array<Array<RenderChunk>>;

export function createRenderChunks(): void {
   renderChunks = new Array<Array<RenderChunk>>();
   
   for (let renderChunkX = 0; renderChunkX < WORLD_RENDER_CHUNK_SIZE; renderChunkX++) {
      renderChunks.push(new Array<RenderChunk>());

      for (let renderChunkY = 0; renderChunkY < WORLD_RENDER_CHUNK_SIZE; renderChunkY++) {
         renderChunks[renderChunkX].push({
            solidTileInfo: createSolidTileRenderChunkData(renderChunkX, renderChunkY),
            riverInfo: calculateRiverRenderChunkData(renderChunkX, renderChunkY),
            ambientOcclusioninfo: calculateAmbientOcclusionInfo(renderChunkX, renderChunkY)
         });
      }
   }
}

export function updateRenderChunkFromTileUpdate(tileUpdate: ServerTileUpdateData): void {
   const renderChunkX = Math.floor(tileUpdate.x / RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(tileUpdate.y / RENDER_CHUNK_SIZE);

   recalculateSolidTileRenderChunkData(renderChunkX, renderChunkY);
}

export function getRenderChunkSolidTileInfo(renderChunkX: number, renderChunkY: number): RenderChunkSolidTileInfo {
   return renderChunks[renderChunkX][renderChunkY].solidTileInfo;
}

export function getRenderChunkRiverInfo(renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo | null {
   return renderChunks[renderChunkX][renderChunkY].riverInfo;
}

export function getRenderChunkAmbientOcclusionInfo(renderChunkX: number, renderChunkY: number): RenderChunkAmbientOcclusionInfo | null {
   return renderChunks[renderChunkX][renderChunkY].ambientOcclusioninfo;
}