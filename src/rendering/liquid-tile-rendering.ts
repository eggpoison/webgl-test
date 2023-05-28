import { SETTINGS } from "webgl-test-shared";
import { TILE_TYPE_RENDER_INFO_RECORD, LiquidTileTypeRenderInfo } from "../tile-type-render-info";
import { createWebGLProgram, gl } from "../webgl";
import Game from "../Game";

const vertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;
attribute vec3 vertColour;

varying vec3 fragColour;
 
void main() {
   fragColour = vertColour;
   
   gl_Position = vec4(vertPosition, 0.0, 1.0);
}
`;

const fragmentShaderText = `
precision mediump float;
 
uniform sampler2D sampler;
 
varying vec3 fragColour;
 
void main() {
   gl_FragColor = vec4(fragColour, 1.0);
}
`;

let program: WebGLProgram;

export function createLiquidTileShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText);
}

const calculateLiquidTileVertices = (): ReadonlyArray<number> => {
   const vertices = new Array<number>();

   for (let tileX = 0; tileX < SETTINGS.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < SETTINGS.BOARD_DIMENSIONS; tileY++) {
         const x1 = tileX * SETTINGS.TILE_SIZE;
         const x2 = (tileX + 1) * SETTINGS.TILE_SIZE;
         const y1 = tileY * SETTINGS.TILE_SIZE;
         const y2 = (tileY + 1) * SETTINGS.TILE_SIZE;

         const tile = Game.board.getTile(tileX, tileY);
   
         const [r, g, b] = (TILE_TYPE_RENDER_INFO_RECORD[tile.type] as LiquidTileTypeRenderInfo).colour;
         vertices.push(
            x1, y1, r, g, b,
            x2, y1, r, g, b,
            x1, y2, r, g, b,
            x1, y2, r, g, b,
            x2, y1, r, g, b,
            x2, y2, r, g, b
         );
      }
   }

   return vertices;
}

export function renderLiquidTiles(): void {
   const vertices = calculateLiquidTileVertices();
   
   gl.useProgram(program);

   // Create tile buffer
   const tileBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   const positionAttribLocation = gl.getAttribLocation(program, "vertPosition");
   const colourAttribLocation = gl.getAttribLocation(program, "vertColour");
   gl.vertexAttribPointer(
      positionAttribLocation, // Attribute location
      2, // Number of elements per attribute
      gl.FLOAT, // Type of elements
      false,
      5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      0 // Offset from the beginning of a single vertex to this attribute
   );
   gl.vertexAttribPointer(
      colourAttribLocation, // Attribute location
      3, // Number of elements per attribute
      gl.FLOAT, // Type of elements
      false,
      5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
   );

   // Enable the attributes
   gl.enableVertexAttribArray(positionAttribLocation);
   gl.enableVertexAttribArray(colourAttribLocation);

   // Draw the tile
   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);
}