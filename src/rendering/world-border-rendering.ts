import { SETTINGS } from "webgl-test-shared";
import Camera from "../Camera";
import { createWebGLProgram, gl } from "../webgl";

const vertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;

void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);
}`;

const fragmentShaderText = `
precision mediump float;

void main() {
   gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

let program: WebGLProgram;

export function createWorldBorderShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText);
}

export function renderWorldBorder(): void {
   const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

   const BORDER_WIDTH = 20;

   gl.useProgram(program);

   const positionAttribLocation = gl.getAttribLocation(program, "vertPosition");
   gl.vertexAttribPointer(
      positionAttribLocation,
      2,
      gl.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0
   );

   // Enable the attributes
   gl.enableVertexAttribArray(positionAttribLocation);

   const minChunkXPos = minChunkX * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;
   const maxChunkXPos = (maxChunkX + 1) * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;
   const minChunkYPos = minChunkY * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;
   const maxChunkYPos = (maxChunkY + 1) * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;

   const vertices = new Array<number>();

   const calculateAndAddVertices = (x1: number, x2: number, y1: number, y2: number): void => {
      // Calculate screen positions
      const screenX1 = Camera.calculateXCanvasPosition(x1);
      const screenX2 = Camera.calculateXCanvasPosition(x2);
      const screenY1 = Camera.calculateYCanvasPosition(y1);
      const screenY2 = Camera.calculateYCanvasPosition(y2);

      vertices.push(
         screenX1, screenY1, // Bottom left
         screenX2, screenY1, // Bottom right
         screenX2, screenY2, // Top right

         screenX1, screenY1, // Bottom left
         screenX2, screenY2, // Top right
         screenX1, screenY2 // Top left
      );
   }

   // Left wall
   if (minChunkX === 0) {
      const x1 = -BORDER_WIDTH;
      const x2 = 0;
      const y1 = minChunkYPos - BORDER_WIDTH;
      const y2 = maxChunkYPos + BORDER_WIDTH;

      calculateAndAddVertices(x1, x2, y1, y2);
   }

   // Right wall
   if (maxChunkX === SETTINGS.BOARD_SIZE - 1) {
      const x1 = maxChunkXPos;
      const x2 = maxChunkXPos + BORDER_WIDTH;
      const y1 = minChunkYPos - BORDER_WIDTH;
      const y2 = maxChunkYPos + BORDER_WIDTH;

      calculateAndAddVertices(x1, x2, y1, y2);
   }

   // Bottom wall
   if (minChunkY === 0) {
      const x1 = minChunkXPos - BORDER_WIDTH;
      const x2 = maxChunkXPos + BORDER_WIDTH;
      const y1 = -BORDER_WIDTH;
      const y2 = 0;

      calculateAndAddVertices(x1, x2, y1, y2);
   }

   // Top wall
   if (maxChunkY === SETTINGS.BOARD_SIZE - 1) {
      const x1 = minChunkXPos - BORDER_WIDTH;
      const x2 = maxChunkXPos + BORDER_WIDTH;
      const y1 = maxChunkYPos;
      const y2 = maxChunkYPos + BORDER_WIDTH;

      calculateAndAddVertices(x1, x2, y1, y2);
   }

   const buffer = gl.createBuffer()!;
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}