import { SETTINGS, TILE_TYPE_INFO_RECORD } from "webgl-test-shared";
import Camera from "../../Camera";
import { Tile } from "../../Tile";
import { getTexture } from "../../textures";
import { TILE_TYPE_RENDER_INFO_RECORD, SolidTileTypeRenderInfo } from "../../tile-type-render-info";
import { gl, halfWindowWidth, halfWindowHeight, createWebGLProgram } from "../../webgl";
import { RENDER_CHUNK_SIZE, RenderChunkSolidTileInfo, getRenderChunkSolidTileInfo } from "./render-chunks";
import Board from "../../Board";

const vertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

layout(location = 0) in vec2 a_tilePos;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
   vec2 screenPos = (a_tilePos - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
}
`;

const fragmentShaderText = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;

in vec2 v_texCoord;

out vec4 outputColour;
 
void main() {
   outputColour = texture(u_texture, v_texCoord);
}
`;

let program: WebGLProgram;

let playerPosUniformLocation: WebGLUniformLocation;
let halfWindowSizeUniformLocation: WebGLUniformLocation;
let zoomUniformLocation: WebGLUniformLocation;
let textureUniformLocation: WebGLUniformLocation;

let texCoordAttribLocation: GLint;

export function calculateSolidTileRenderChunkData(renderChunkX: number, renderChunkY: number): RenderChunkSolidTileInfo {
   const tileMinX = renderChunkX * RENDER_CHUNK_SIZE;
   const tileMaxX = (renderChunkX + 1) * RENDER_CHUNK_SIZE - 1;
   const tileMinY = renderChunkY * RENDER_CHUNK_SIZE;
   const tileMaxY = (renderChunkY + 1) * RENDER_CHUNK_SIZE - 1;
   
   // Categorize the tiles based on their texture
   const tilesCategorised: { [textureSource: string]: Array<Tile> } = {};
   for (let tileX = tileMinX; tileX <= tileMaxX; tileX++) {
      for (let tileY = tileMinY; tileY <= tileMaxY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (!TILE_TYPE_INFO_RECORD[tile.type].isLiquid) {
            const textureSource = (TILE_TYPE_RENDER_INFO_RECORD[tile.type] as SolidTileTypeRenderInfo).textureSource;

            if (!tilesCategorised.hasOwnProperty(textureSource)) {
               tilesCategorised[textureSource] = new Array<Tile>();
            }

            tilesCategorised[textureSource].push(tile);
         }
      }
   }

   const vaos = new Array<WebGLVertexArrayObject>();
   const vertexCounts = new Array<number>();
   const indexedTextureSources = new Array<string>();

   let idx = 0;
   for (const [textureSource, tiles] of Object.entries(tilesCategorised)) {
      const vertexData = new Float32Array(tiles.length * 24);

      for (let i = 0; i < tiles.length; i++) {
         const tile = tiles[i];

         const x1 = tile.x * SETTINGS.TILE_SIZE;
         const x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
         const y1 = tile.y * SETTINGS.TILE_SIZE;
         const y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

         vertexData[i * 24] = x1;
         vertexData[i * 24 + 1] = y1;
         vertexData[i * 24 + 2] = 0;
         vertexData[i * 24 + 3] = 0;

         vertexData[i * 24 + 4] = x2;
         vertexData[i * 24 + 5] = y1;
         vertexData[i * 24 + 6] = 1;
         vertexData[i * 24 + 7] = 0;

         vertexData[i * 24 + 8] = x1;
         vertexData[i * 24 + 9] = y2;
         vertexData[i * 24 + 10] = 0;
         vertexData[i * 24 + 11] = 1;

         vertexData[i * 24 + 12] = x1;
         vertexData[i * 24 + 13] = y2;
         vertexData[i * 24 + 14] = 0;
         vertexData[i * 24 + 15] = 1;

         vertexData[i * 24 + 16] = x2;
         vertexData[i * 24 + 17] = y1;
         vertexData[i * 24 + 18] = 1;
         vertexData[i * 24 + 19] = 0;

         vertexData[i * 24 + 20] = x2;
         vertexData[i * 24 + 21] = y2;
         vertexData[i * 24 + 22] = 1;
         vertexData[i * 24 + 23] = 1;
      }

      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);

      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
      
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(texCoordAttribLocation);

      gl.bindVertexArray(null);

      vaos[idx] = vao;
      vertexCounts[idx] = tiles.length * 24;
      indexedTextureSources[idx] = textureSource;

      idx++;
   }

   return {
      vaos: vaos,
      vertexCounts: vertexCounts,
      indexedTextureSources: indexedTextureSources
   };
}

export function createSolidTileShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText, "a_tilePos");

   playerPosUniformLocation = gl.getUniformLocation(program, "u_playerPos")!;
   halfWindowSizeUniformLocation = gl.getUniformLocation(program, "u_halfWindowSize")!;
   zoomUniformLocation = gl.getUniformLocation(program, "u_zoom")!;
   textureUniformLocation = gl.getUniformLocation(program, "u_texture")!;

   gl.bindAttribLocation(program, 0, "a_tilePos");
   texCoordAttribLocation = gl.getAttribLocation(program, "a_texCoord");
}

export function renderSolidTiles(): void {
   gl.useProgram(program);

   const [minRenderChunkX, maxRenderChunkX, minRenderChunkY, maxRenderChunkY] = Camera.calculateVisibleRenderChunkBounds();

   for (let renderChunkX = minRenderChunkX; renderChunkX <= maxRenderChunkX; renderChunkX++) {
      for (let renderChunkY = minRenderChunkY; renderChunkY <= maxRenderChunkY; renderChunkY++) {
         const renderChunkInfo = getRenderChunkSolidTileInfo(renderChunkX, renderChunkY);

         for (let idx = 0; idx < renderChunkInfo.vaos.length; idx++) {
            const vao = renderChunkInfo.vaos[idx];
            gl.bindVertexArray(vao);
            
            gl.uniform2f(playerPosUniformLocation, Camera.position.x, Camera.position.y);
            gl.uniform2f(halfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
            gl.uniform1f(zoomUniformLocation, Camera.zoom);
            gl.uniform1i(textureUniformLocation, 0);
            
            // Set all texture units
            const texture = getTexture("tiles/" + renderChunkInfo.indexedTextureSources[idx]);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
      
            // Draw the tiles
            gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.vertexCounts[idx] / 4);
         }
      }
   }

   gl.bindVertexArray(null);
}