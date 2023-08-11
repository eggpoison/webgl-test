import { SETTINGS } from "webgl-test-shared";
import { TILE_TYPE_RENDER_INFO_RECORD, LiquidTileTypeRenderInfo } from "../../tile-type-render-info";
import { createWebGLProgram, gl } from "../../webgl";
import Game from "../../Game";
import { getTexture } from "../../textures";
import Camera from "../../Camera";

const vertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

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

let textureUniformLocation: WebGLUniformLocation;

let positionAttribLocation: GLint;
let texCoordAttribLocation: GLint;

export function createLiquidTileShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText);

   textureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   positionAttribLocation = gl.getAttribLocation(program, "a_position");
   texCoordAttribLocation = gl.getAttribLocation(program, "a_texCoord");
}

const calculateLiquidTileVertices = (): Record<string, ReadonlyArray<number>> => {
   const vertexRecord: Record<string, Array<number>> = {};

   const visibleChunkBounds = Camera.getVisibleChunkBounds();

   const minTileX = visibleChunkBounds[0] * SETTINGS.CHUNK_SIZE;
   const maxTileX = (visibleChunkBounds[1] + 1) * SETTINGS.CHUNK_SIZE - 1;
   const minTileY = visibleChunkBounds[2] * SETTINGS.CHUNK_SIZE;
   const maxTileY = (visibleChunkBounds[3] + 1) * SETTINGS.CHUNK_SIZE - 1;
   
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Game.board.getTile(tileX, tileY);

         const tileTypeRenderInfo = TILE_TYPE_RENDER_INFO_RECORD[tile.type] as LiquidTileTypeRenderInfo;
         if (!tileTypeRenderInfo.isLiquid) {
            continue;
         }

         const textureSource = tileTypeRenderInfo.textureSource;
         if (!vertexRecord.hasOwnProperty(textureSource)) {
            vertexRecord[textureSource] = [];
         }

         let x1 = tileX * SETTINGS.TILE_SIZE;
         let x2 = (tileX + 1) * SETTINGS.TILE_SIZE;
         let y1 = tileY * SETTINGS.TILE_SIZE;
         let y2 = (tileY + 1) * SETTINGS.TILE_SIZE;

         x1 = Camera.calculateXCanvasPosition(x1);
         x2 = Camera.calculateXCanvasPosition(x2);
         y1 = Camera.calculateYCanvasPosition(y1);
         y2 = Camera.calculateYCanvasPosition(y2);
   
         vertexRecord[textureSource].push(
            x1, y1, 0, 0,
            x2, y1, 1, 0,
            x1, y2, 0, 1,
            x1, y2, 0, 1,
            x2, y1, 1, 0,
            x2, y2, 1, 1
         );
      }
   }

   return vertexRecord;
}

export function renderLiquidTiles(): void {
   const vertexRecord = calculateLiquidTileVertices();
   
   gl.useProgram(program);

   for (const [textureSource, vertices] of Object.entries(vertexRecord)) {
      // Create tile buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
      gl.vertexAttribPointer(
         positionAttribLocation, // Attribute location
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
   
      // Enable the attributes
      gl.enableVertexAttribArray(positionAttribLocation);
      gl.enableVertexAttribArray(texCoordAttribLocation);
      
      gl.uniform1i(textureUniformLocation, 0);
               
      // Set texture unit
      const texture = getTexture("tiles/" + textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
   
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
   }
}