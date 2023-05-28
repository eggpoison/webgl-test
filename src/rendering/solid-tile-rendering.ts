import { SETTINGS, TILE_TYPE_INFO_RECORD } from "webgl-test-shared";
import Camera from "../Camera";
import { Tile } from "../Tile";
import { getTexture } from "../textures";
import { TILE_TYPE_RENDER_INFO_RECORD, SolidTileTypeRenderInfo } from "../tile-type-render-info";
import { gl, halfWindowWidth, halfWindowHeight, createWebGLProgram } from "../webgl";
import Game from "../Game";

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

let vertexCounts = new Array<number>();
let buffers = new Array<WebGLBuffer>();
let indexedTextureSources = new Array<string>();

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

   for (let idx = 0; idx < buffers.length; idx++) {
      const buffer = buffers[idx];
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
      const texture = getTexture("tiles/" + indexedTextureSources[idx]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Draw the tiles
      gl.drawArrays(gl.TRIANGLES, 0, vertexCounts[idx] / 4);
   }
}

export function updateSolidTileRenderData(): void {
   // Clear previous data
   buffers = new Array<WebGLBuffer>();
   indexedTextureSources = new Array<string>();
   vertexCounts = new Array<number>();

   // Categorize the tiles based on their texture
   const visibleTilesCategorized: { [textureSource: string]: Array<Tile> } = {};
   for (let x = 0; x < SETTINGS.BOARD_DIMENSIONS; x++) {
      for (let y = 0; y < SETTINGS.BOARD_DIMENSIONS; y++) {
         const tile = Game.board.getTile(x, y);
         if (!TILE_TYPE_INFO_RECORD[tile.type].isLiquid) {
            const textureSource = (TILE_TYPE_RENDER_INFO_RECORD[tile.type] as SolidTileTypeRenderInfo).textureSource;

            if (!visibleTilesCategorized.hasOwnProperty(textureSource)) {
               visibleTilesCategorized[textureSource] = new Array<Tile>();
            }

            visibleTilesCategorized[textureSource].push(tile);
         }
      }
   }

   let idx = 0;
   for (const [textureSource, tiles] of Object.entries(visibleTilesCategorized)) {
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
}