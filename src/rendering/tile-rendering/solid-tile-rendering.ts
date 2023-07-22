import { SETTINGS, ServerTileUpdateData, TILE_TYPE_INFO_RECORD } from "webgl-test-shared";
import Camera from "../../Camera";
import { Tile } from "../../Tile";
import { getTexture } from "../../textures";
import { TILE_TYPE_RENDER_INFO_RECORD, SolidTileTypeRenderInfo } from "../../tile-type-render-info";
import { gl, halfWindowWidth, halfWindowHeight, createWebGLProgram } from "../../webgl";
import Game from "../../Game";

const vertexShaderText = `
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;

attribute vec2 a_tilePos;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
   vec2 screenPos = a_tilePos - u_playerPos + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
}
`;

const fragmentShaderText = `
precision mediump float;

uniform sampler2D u_texture;

varying vec2 v_texCoord;
 
void main() {
   gl_FragColor = texture2D(u_texture, v_texCoord);
}
`;

let program: WebGLProgram;

let playerPosUniformLocation: WebGLUniformLocation;
let halfWindowSizeUniformLocation: WebGLUniformLocation;
let textureUniformLocation: WebGLUniformLocation;

let tilePosAttribLocation: GLint;
let texCoordAttribLocation: GLint;

// let vertexCounts = new Array<number>();
// let buffers = new Array<WebGLBuffer>();
// let indexedTextureSources = new Array<string>();

/** Width and height of a render chunk in tiles */
export const RENDER_CHUNK_SIZE = 8;

export const WORLD_RENDER_CHUNK_SIZE = SETTINGS.BOARD_DIMENSIONS / RENDER_CHUNK_SIZE;

/**
 * Stores rendering information about one render chunk of the world.
 * A render chunk can contain multiple buffers depending on the number of different tile types in the chunk.
*/
interface RenderChunk {
   buffers: Array<WebGLBuffer>;
   vertexCounts: Array<number>;
   indexedTextureSources: Array<string>;
}

let renderChunks = new Array<Array<RenderChunk>>();

const generateRenderChunk = (renderChunkX: number, renderChunkY: number): RenderChunk => {
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

export function createRenderChunkBuffers(): void {
   renderChunks = new Array<Array<RenderChunk>>();
   
   for (let renderChunkX = 0; renderChunkX < WORLD_RENDER_CHUNK_SIZE; renderChunkX++) {
      renderChunks.push(new Array<RenderChunk>());

      for (let renderChunkY = 0; renderChunkY < WORLD_RENDER_CHUNK_SIZE; renderChunkY++) {
         const renderChunk = generateRenderChunk(renderChunkX, renderChunkY);
         renderChunks[renderChunkX].push(renderChunk);
      }
   }
}

export function updateRenderChunkFromTileBuffer(tileUpdate: ServerTileUpdateData): void {
   const renderChunkX = Math.floor(tileUpdate.x / RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(tileUpdate.y / RENDER_CHUNK_SIZE);

   const renderChunk = generateRenderChunk(renderChunkX, renderChunkY);
   renderChunks[renderChunkX][renderChunkY] = renderChunk;
}

export function createSolidTileShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText, "a_tilePos");

   playerPosUniformLocation = gl.getUniformLocation(program, "u_playerPos")!;
   halfWindowSizeUniformLocation = gl.getUniformLocation(program, "u_halfWindowSize")!;
   textureUniformLocation = gl.getUniformLocation(program, "u_texture")!;

   tilePosAttribLocation = gl.getAttribLocation(program, "a_tilePos");
   texCoordAttribLocation = gl.getAttribLocation(program, "a_texCoord");
}

export function renderSolidTiles(): void {
   gl.useProgram(program);

   const [minRenderChunkX, maxRenderChunkX, minRenderChunkY, maxRenderChunkY] = Camera.calculateVisibleRenderChunkBounds();

   for (let renderChunkX = minRenderChunkX; renderChunkX <= maxRenderChunkX; renderChunkX++) {
      for (let renderChunkY = minRenderChunkY; renderChunkY <= maxRenderChunkY; renderChunkY++) {
         const renderChunk = renderChunks[renderChunkX][renderChunkY];

         for (let idx = 0; idx < renderChunk.buffers.length; idx++) {
            const buffer = renderChunk.buffers[idx];
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      
            gl.vertexAttribPointer(
               tilePosAttribLocation, // Attribute location
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
         
            // Enable the attributes
            gl.enableVertexAttribArray(tilePosAttribLocation);
            gl.enableVertexAttribArray(texCoordAttribLocation);
      
            gl.uniform1i(textureUniformLocation, 0);
            
            // Set all texture units
            const texture = getTexture("tiles/" + renderChunk.indexedTextureSources[idx]);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
      
            // Draw the tiles
            gl.drawArrays(gl.TRIANGLES, 0, renderChunk.vertexCounts[idx] / 4);
         }
      }
   }
}