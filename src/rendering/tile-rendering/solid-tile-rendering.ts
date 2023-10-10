import { SETTINGS, TileType } from "webgl-test-shared";
import Camera from "../../Camera";
import { TEXTURE_IMAGE_RECORD } from "../../textures";
import { gl, createWebGLProgram, CAMERA_UNIFORM_BUFFER_BINDING_INDEX } from "../../webgl";
import { RENDER_CHUNK_SIZE, RenderChunkSolidTileInfo, getRenderChunkSolidTileInfo } from "./render-chunks";
import Board from "../../Board";
import { TILE_TYPE_TEXTURE_SOURCES } from "../../tile-type-texture-sources";

const vertexShaderText = `#version 300 es
precision mediump float;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_tilePos;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in float a_textureIndex;

out vec2 v_texCoord;
out float v_textureIndex;

void main() {
   vec2 screenPos = (a_tilePos - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_textureIndex = a_textureIndex;
}
`;

const fragmentShaderText = `#version 300 es
precision highp float;

uniform highp sampler2DArray u_sampler;

in vec2 v_texCoord;
in float v_textureIndex;

out vec4 outputColour;
 
void main() {
   outputColour = texture(u_sampler, vec3(v_texCoord, v_textureIndex));
}
`;

let program: WebGLProgram;

export function createSolidTileShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText, "a_tilePos");

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   gl.useProgram(program);
   
   const samplerUniformLocation = gl.getUniformLocation(program, "u_sampler")!;
   gl.uniform1i(samplerUniformLocation, 0);
}

const updateVertexData = (textureSources: Array<string>, data: Float32Array, renderChunkX: number, renderChunkY: number): void => {
   const tileMinX = renderChunkX * RENDER_CHUNK_SIZE;
   const tileMaxX = (renderChunkX + 1) * RENDER_CHUNK_SIZE - 1;
   const tileMinY = renderChunkY * RENDER_CHUNK_SIZE;
   const tileMaxY = (renderChunkY + 1) * RENDER_CHUNK_SIZE - 1;
   
   let tileIndex = 0;
   for (let tileX = tileMinX; tileX <= tileMaxX; tileX++) {
      for (let tileY = tileMinY; tileY <= tileMaxY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type === TileType.water) {
            continue;
         }

         const textureSource = TILE_TYPE_TEXTURE_SOURCES[tile.type];
         let textureIndex = textureSources.indexOf(textureSource);
         if (textureIndex === -1) {
            textureSources.push(textureSource);
            textureIndex = textureSources.length - 1;
         }

         const x1 = tile.x * SETTINGS.TILE_SIZE;
         const x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
         const y1 = tile.y * SETTINGS.TILE_SIZE;
         const y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

         data[tileIndex * 30] = x1;
         data[tileIndex * 30 + 1] = y1;
         data[tileIndex * 30 + 2] = 0;
         data[tileIndex * 30 + 3] = 0;
         data[tileIndex * 30 + 4] = textureIndex;

         data[tileIndex * 30 + 5] = x2;
         data[tileIndex * 30 + 6] = y1;
         data[tileIndex * 30 + 7] = 1;
         data[tileIndex * 30 + 8] = 0;
         data[tileIndex * 30 + 9] = textureIndex;

         data[tileIndex * 30 + 10] = x1;
         data[tileIndex * 30 + 11] = y2;
         data[tileIndex * 30 + 12] = 0;
         data[tileIndex * 30 + 13] = 1;
         data[tileIndex * 30 + 14] = textureIndex;

         data[tileIndex * 30 + 15] = x1;
         data[tileIndex * 30 + 16] = y2;
         data[tileIndex * 30 + 17] = 0;
         data[tileIndex * 30 + 18] = 1;
         data[tileIndex * 30 + 19] = textureIndex;

         data[tileIndex * 30 + 20] = x2;
         data[tileIndex * 30 + 21] = y1;
         data[tileIndex * 30 + 22] = 1;
         data[tileIndex * 30 + 23] = 0;
         data[tileIndex * 30 + 24] = textureIndex;

         data[tileIndex * 30 + 25] = x2;
         data[tileIndex * 30 + 26] = y2;
         data[tileIndex * 30 + 27] = 1;
         data[tileIndex * 30 + 28] = 1;
         data[tileIndex * 30 + 29] = textureIndex;

         tileIndex++;
      }
   }
}

// @Cleanup A lot of the webgl calls in create and update render data are the same

export function createSolidTileRenderChunkData(renderChunkX: number, renderChunkY: number): RenderChunkSolidTileInfo {
   const tileMinX = renderChunkX * RENDER_CHUNK_SIZE;
   const tileMaxX = (renderChunkX + 1) * RENDER_CHUNK_SIZE - 1;
   const tileMinY = renderChunkY * RENDER_CHUNK_SIZE;
   const tileMaxY = (renderChunkY + 1) * RENDER_CHUNK_SIZE - 1;
   
   let numTiles = 0;
   for (let tileX = tileMinX; tileX <= tileMaxX; tileX++) {
      for (let tileY = tileMinY; tileY <= tileMaxY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type !== TileType.water) {
            numTiles++;
         }
      }
   }

   const textureSources = new Array<string>();
   const vertexData = new Float32Array(numTiles * 6 * 5);
   updateVertexData(textureSources, vertexData, renderChunkX, renderChunkY);

   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   gl.bindVertexArray(null);

   const texture = gl.createTexture()!;
   gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
   gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 5, gl.RGBA8, 16, 16, textureSources.length);

   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   
   // Set all texture units
   for (let i = 0; i < textureSources.length; i++) {
      const textureSource = textureSources[i];
      const image = TEXTURE_IMAGE_RECORD[textureSource];
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, 16, 16, 1, gl.RGBA, gl.UNSIGNED_BYTE, image);
   }

   gl.generateMipmap(gl.TEXTURE_2D_ARRAY);

   return {
      buffer: buffer,
      vao: vao,
      vertexCount: numTiles * 6 * 5,
      texture: texture
   };
}

export function recalculateSolidTileRenderChunkData(renderChunkX: number, renderChunkY: number): void {
   const info = getRenderChunkSolidTileInfo(renderChunkX, renderChunkY);
   
   const vertexData = new Float32Array(info.vertexCount);
   const textureSources = new Array<string>();
   updateVertexData(textureSources, vertexData, renderChunkX, renderChunkY);

   gl.bindVertexArray(info.vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, info.buffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexData);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   // The number of tiles in the buffer remains the same whenever it is regenerated, so we don't need
   // to change the vertex count

   gl.bindVertexArray(null);

   const texture = gl.createTexture()!;
   gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
   gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 5, gl.RGBA8, 16, 16, textureSources.length);

   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   
   // Set all texture units
   for (let i = 0; i < textureSources.length; i++) {
      const textureSource = textureSources[i];
      const image = TEXTURE_IMAGE_RECORD[textureSource];
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, 16, 16, 1, gl.RGBA, gl.UNSIGNED_BYTE, image);
   }

   info.texture = texture;
}

export function renderSolidTiles(): void {
   // @Speed: We can avoid the bindTexture call for each chunk by making a texture atlas for tiles
   
   gl.useProgram(program);

   gl.activeTexture(gl.TEXTURE0);
   
   for (let renderChunkX = Camera.minVisibleRenderChunkX; renderChunkX <= Camera.maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = Camera.minVisibleRenderChunkY; renderChunkY <= Camera.maxVisibleRenderChunkY; renderChunkY++) {
         const renderChunkInfo = getRenderChunkSolidTileInfo(renderChunkX, renderChunkY);
         gl.bindVertexArray(renderChunkInfo.vao);

         gl.bindTexture(gl.TEXTURE_2D_ARRAY, renderChunkInfo.texture);
         
         // Draw the tiles
         gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.vertexCount / 5);
      }
   }

   gl.bindVertexArray(null);
}