import { SETTINGS } from "webgl-test-shared";
import Camera from "../Camera";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";

const vertexShaderText = `#version 300 es
precision mediump float;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_position;

void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);
}`;

const fragmentShaderText = `#version 300 es
precision mediump float;

out vec4 outputColour;

void main() {
   outputColour = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

let program: WebGLProgram;
let buffer: WebGLBuffer;

export function createWorldBorderShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   buffer = gl.createBuffer()!;
}

export function renderWorldBorder(): void {
   const BORDER_WIDTH = 20;

   const minChunkXPos = Camera.minVisibleChunkX * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;
   const maxChunkXPos = (Camera.maxVisibleChunkX + 1) * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;
   const minChunkYPos = Camera.minVisibleChunkY * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;
   const maxChunkYPos = (Camera.maxVisibleChunkY + 1) * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;

   const leftBorderIsVisible = Camera.minVisibleChunkX === 0;
   const rightBorderIsVisible = Camera.maxVisibleChunkX === SETTINGS.BOARD_SIZE - 1;
   const bottomBorderIsVisible = Camera.minVisibleChunkY === 0;
   const topBorderIsVisible = Camera.maxVisibleChunkY === SETTINGS.BOARD_SIZE - 1;

   let numVisibleBorders = 0;
   if (leftBorderIsVisible) {
      numVisibleBorders++;
   }
   if (rightBorderIsVisible) {
      numVisibleBorders++;
   }
   if (bottomBorderIsVisible) {
      numVisibleBorders++;
   }
   if (topBorderIsVisible) {
      numVisibleBorders++;
   }

   if (numVisibleBorders === 0) {
      return;
   }

   const vertexData = new Float32Array(numVisibleBorders * 6 * 2);

   // Left border
   if (leftBorderIsVisible) {
      const x1 = -BORDER_WIDTH;
      const x2 = 0;
      const y1 = minChunkYPos - BORDER_WIDTH;
      const y2 = maxChunkYPos + BORDER_WIDTH;

      vertexData[0] = x1;
      vertexData[1] = y1;
      vertexData[2] = x2;
      vertexData[3] = y1;
      vertexData[4] = x2;
      vertexData[5] = y2;
      vertexData[6] = x1;
      vertexData[7] = y1;
      vertexData[8] = x2;
      vertexData[9] = y2;
      vertexData[10] = x1;
      vertexData[11] = y2;
   }

   // Right border
   if (rightBorderIsVisible) {
      const x1 = maxChunkXPos;
      const x2 = maxChunkXPos + BORDER_WIDTH;
      const y1 = minChunkYPos - BORDER_WIDTH;
      const y2 = maxChunkYPos + BORDER_WIDTH;

      const arrayOffset = leftBorderIsVisible ? 12 : 0;

      vertexData[arrayOffset] = x1;
      vertexData[arrayOffset + 1] = y1;
      vertexData[arrayOffset + 2] = x2;
      vertexData[arrayOffset + 3] = y1;
      vertexData[arrayOffset + 4] = x2;
      vertexData[arrayOffset + 5] = y2;
      vertexData[arrayOffset + 6] = x1;
      vertexData[arrayOffset + 7] = y1;
      vertexData[arrayOffset + 8] = x2;
      vertexData[arrayOffset + 9] = y2;
      vertexData[arrayOffset + 10] = x1;
      vertexData[arrayOffset + 11] = y2;
   }

   // Bottom border
   if (bottomBorderIsVisible) {
      const x1 = minChunkXPos - BORDER_WIDTH;
      const x2 = maxChunkXPos + BORDER_WIDTH;
      const y1 = -BORDER_WIDTH;
      const y2 = 0;

      let arrayOffset = 0;
      if (leftBorderIsVisible) {
         arrayOffset += 12;
      }
      if (rightBorderIsVisible) {
         arrayOffset += 12;
      }

      vertexData[arrayOffset] = x1;
      vertexData[arrayOffset + 1] = y1;
      vertexData[arrayOffset + 2] = x2;
      vertexData[arrayOffset + 3] = y1;
      vertexData[arrayOffset + 4] = x2;
      vertexData[arrayOffset + 5] = y2;
      vertexData[arrayOffset + 6] = x1;
      vertexData[arrayOffset + 7] = y1;
      vertexData[arrayOffset + 8] = x2;
      vertexData[arrayOffset + 9] = y2;
      vertexData[arrayOffset + 10] = x1;
      vertexData[arrayOffset + 11] = y2;
   }

   // Top border
   if (topBorderIsVisible) {
      const x1 = minChunkXPos - BORDER_WIDTH;
      const x2 = maxChunkXPos + BORDER_WIDTH;
      const y1 = maxChunkYPos;
      const y2 = maxChunkYPos + BORDER_WIDTH;

      let arrayOffset = 0;
      if (leftBorderIsVisible) {
         arrayOffset += 12;
      }
      if (rightBorderIsVisible) {
         arrayOffset += 12;
      }
      if (bottomBorderIsVisible) {
         arrayOffset += 12;
      }

      vertexData[arrayOffset] = x1;
      vertexData[arrayOffset + 1] = y1;
      vertexData[arrayOffset + 2] = x2;
      vertexData[arrayOffset + 3] = y1;
      vertexData[arrayOffset + 4] = x2;
      vertexData[arrayOffset + 5] = y2;
      vertexData[arrayOffset + 6] = x1;
      vertexData[arrayOffset + 7] = y1;
      vertexData[arrayOffset + 8] = x2;
      vertexData[arrayOffset + 9] = y2;
      vertexData[arrayOffset + 10] = x1;
      vertexData[arrayOffset + 11] = y2;
   }

   gl.useProgram(program);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   // Enable the attributes
   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, numVisibleBorders * 6);
}