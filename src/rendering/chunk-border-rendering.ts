import { SETTINGS } from "webgl-test-shared";
import Camera from "../Camera";
import { createWebGLProgram, gl } from "../webgl";


const chunkBorderColour = "1.0, 0.0, 0.0";
const vertexShaderText = `
precision lowp float;

attribute vec2 vertPosition;

void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);
}`;
const fragmentShaderText = `
precision mediump float;

void main() {
   gl_FragColor = vec4(${chunkBorderColour}, 1.0);
}
`;

let program: WebGLProgram;

export function createChunkBorderShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText);
}

export function renderChunkBorders(): void {
   gl.useProgram(program);
   
   const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

   const vertices = new Array<number>();

   // Calculate line end positions
   const top = Camera.calculateYCanvasPosition(SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE);
   const bottom = Camera.calculateYCanvasPosition(0);
   const left = Camera.calculateXCanvasPosition(0);
   const right = Camera.calculateXCanvasPosition(SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE);

   // Horizontal lines
   for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      const screenY = Camera.calculateYCanvasPosition(chunkY * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
      vertices.push(
         left, screenY,
         right, screenY
      );
   }

   // Vertical lines
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      const screenX = Camera.calculateXCanvasPosition(chunkX * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
      vertices.push(
         screenX, top,
         screenX, bottom
      );
   }

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   const positionAttribLocation = gl.getAttribLocation(program, "vertPosition");
   gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(positionAttribLocation);

   gl.drawArrays(gl.LINES, 0, vertices.length / 2);
}