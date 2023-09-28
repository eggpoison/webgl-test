import { SETTINGS } from "webgl-test-shared";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";

const chunkBorderColour = "1.0, 0.0, 0.0";

const top = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE;
const bottom = 0;
const left = 0;
const right = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE;

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
}
`;
const fragmentShaderText = `#version 300 es
precision mediump float;

out vec4 outputColour;

void main() {
   outputColour = vec4(${chunkBorderColour}, 1.0);
}
`;

let program: WebGLProgram;

export function createChunkBorderShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
}

export function renderChunkBorders(minX: number, maxX: number, minY: number, maxY: number, chunkSize: number, thickness: number): void {
   gl.useProgram(program);
   
   const vertices = new Array<number>();

   const halfThickness = thickness/2;

   // Horizontal lines
   for (let chunkY = minY; chunkY <= maxY; chunkY++) {
      const screenY = chunkY * chunkSize * SETTINGS.TILE_SIZE;
      vertices.push(
         left, screenY - halfThickness, // Bottom left
         right, screenY - halfThickness, // Bottom right
         left, screenY + halfThickness, // Top left
         left, screenY + halfThickness, // Top left
         right, screenY - halfThickness, // Bottom right
         right, screenY + halfThickness, // Top right
      );
   }

   // Vertical lines
   for (let chunkX = minX; chunkX <= maxX; chunkX++) {
      const screenX = chunkX * chunkSize * SETTINGS.TILE_SIZE;
      vertices.push(
         screenX - halfThickness, bottom, // Bottom left
         screenX + halfThickness, bottom, // Bottom right
         screenX - halfThickness, top, // Top left
         screenX - halfThickness, top, // Top left
         screenX + halfThickness, bottom, // Bottom right
         screenX + halfThickness, top, // Top right
      );
   }

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}