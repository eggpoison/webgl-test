import { SETTINGS, ServerTileUpdateData, TILE_TYPE_INFO_RECORD } from "webgl-test-shared";
import Camera from "../../Camera";
import { Tile } from "../../Tile";
import { getTexture } from "../../textures";
import { TILE_TYPE_RENDER_INFO_RECORD, SolidTileTypeRenderInfo } from "../../tile-type-render-info";
import { gl, halfWindowWidth, halfWindowHeight, createWebGLProgram } from "../../webgl";
import Game from "../../Game";
import { RENDER_CHUNK_SIZE, RenderChunkSolidTileInfo, getRenderChunkSolidTileInfo } from "./render-chunks";

const vertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

in vec2 a_tilePos;
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
         const tile = Game.board.getTile(tileX, tileY);
         if (!TILE_TYPE_INFO_RECORD[tile.type].isLiquid) {
            const textureSource = (TILE_TYPE_RENDER_INFO_RECORD[tile.type] as SolidTileTypeRenderInfo).textureSource;

            if (!tilesCategorised.hasOwnProperty(textureSource)) {
               tilesCategorised[textureSource] = new Array<Tile>();
            }

            tilesCategorised[textureSource].push(tile);
         }
      }
   }

   let buffers = new Array<WebGLBuffer>();
   let vertexCounts = new Array<number>();
   let indexedTextureSources = new Array<string>();

   let idx = 0;
   for (const [textureSource, tiles] of Object.entries(tilesCategorised)) {
      const vertices = new Array<number>();

      for (const tile of tiles) {
         const x1 = tile.x * SETTINGS.TILE_SIZE;
         const x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
         const y1 = tile.y * SETTINGS.TILE_SIZE;
         const y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

         vertices.push(
            x1, y1, 0, 0,
            x2, y1, 1, 0,
            x1, y2, 0, 1,
            x1, y2, 0, 1,
            x2, y1, 1, 0,
            x2, y2, 1, 1
         );
      }

      // Create tile buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      buffers[idx] = buffer;
      vertexCounts[idx] = vertices.length;
      indexedTextureSources[idx] = textureSource;

      idx++;
   }

   return {
      buffers: buffers,
      vertexCounts: vertexCounts,
      indexedTextureSources: indexedTextureSources
   };
}

export function createSolidTileShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText, "a_tilePos");

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

         for (let idx = 0; idx < renderChunkInfo.buffers.length; idx++) {
            const buffer = renderChunkInfo.buffers[idx];
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      
            gl.vertexAttribPointer(
               0, // Attribute location
               2, // Number of elements per attribute
               gl.FLOAT, // Type of elements
               false,
               4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
               0 // Offset from the beginning of a single vertex to this attribute
            );
            gl.vertexAttribPointer(
               texCoordAttribLocation, // Attribute location
               2, // Number of elements per attribute
               gl.FLOAT, // Type of elements
               false,
               4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
               2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
            );
      
            gl.uniform2f(playerPosUniformLocation, Camera.position.x, Camera.position.y);
            gl.uniform2f(halfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
            gl.uniform1f(zoomUniformLocation, Camera.zoom);
         
            // Enable the attributes
            gl.enableVertexAttribArray(0);
            gl.enableVertexAttribArray(texCoordAttribLocation);
      
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
}