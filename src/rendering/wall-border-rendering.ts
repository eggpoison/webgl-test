import { SETTINGS } from "webgl-test-shared";
import Camera from "../Camera";
import { Tile } from "../Tile";
import { createWebGLProgram, gl } from "../webgl";
import Board from "../Board";

const BORDER_THICKNESS = 5;

const vertexShaderText = `#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;

void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderText = `#version 300 es
precision mediump float;

out vec4 outputColour;

void main() {
   outputColour = vec4(0.15, 0.15, 0.15, 1.0);
}
`;

let program: WebGLProgram;

export function createWallBorderShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
}

export function renderWallBorders(): void {
   // 
   // Find visible wall tiles
   // 

   const minTileX = Camera.visibleChunkBounds[0] * SETTINGS.CHUNK_SIZE;
   const maxTileX = (Camera.visibleChunkBounds[1] + 1) * SETTINGS.CHUNK_SIZE - 1;
   const minTileY = Camera.visibleChunkBounds[2] * SETTINGS.CHUNK_SIZE;
   const maxTileY = (Camera.visibleChunkBounds[3] + 1) * SETTINGS.CHUNK_SIZE - 1;

   const wallTiles = new Array<Tile>();
   for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.isWall) {
            wallTiles.push(tile);
         }
      }
   }

   if (wallTiles.length === 0) {
      return;
   }

   // @Cleanup: This requests way more space than is usually required. Find better way
   const vertexData = new Float32Array(2 * 6 * wallTiles.length * 4); // x4 because each wall tile could potentially have 4 borders

   // Create vertices
   let borderIdx = 0;
   for (const tile of wallTiles) {
      const topTile = tile.y < SETTINGS.BOARD_DIMENSIONS - 1 ? Board.getTile(tile.x, tile.y + 1) : null;
      const leftTile = tile.x > 0 ? Board.getTile(tile.x - 1, tile.y) : null;
      const bottomTile = tile.y > 0 ? Board.getTile(tile.x, tile.y - 1) : null;
      const rightTile = tile.x < SETTINGS.BOARD_DIMENSIONS - 1 ? Board.getTile(tile.x + 1, tile.y) : null;

      const topOvershoot = topTile !== null && topTile.isWall ? BORDER_THICKNESS : 0;
      const leftOvershoot = leftTile !== null && leftTile.isWall ? BORDER_THICKNESS : 0;
      const bottomOvershoot = bottomTile !== null && bottomTile.isWall ? BORDER_THICKNESS : 0;
      const rightOvershoot = rightTile !== null && rightTile.isWall ? BORDER_THICKNESS : 0;

      // Top border
      if (topTile !== null && !topTile.isWall) {
         const x1 = Camera.calculateXCanvasPosition(tile.x * SETTINGS.TILE_SIZE - leftOvershoot);
         const x2 = Camera.calculateXCanvasPosition((tile.x + 1) * SETTINGS.TILE_SIZE + rightOvershoot);
         const y1 = Camera.calculateYCanvasPosition((tile.y + 1) * SETTINGS.TILE_SIZE - BORDER_THICKNESS);
         const y2 = Camera.calculateYCanvasPosition((tile.y + 1) * SETTINGS.TILE_SIZE);
         const dataOffset = borderIdx * 2 * 6;
         vertexData[dataOffset] = x1;
         vertexData[dataOffset + 1] = y1;
         vertexData[dataOffset + 2] = x2;
         vertexData[dataOffset + 3] = y1;
         vertexData[dataOffset + 4] = x1;
         vertexData[dataOffset + 5] = y2;
         vertexData[dataOffset + 6] = x1;
         vertexData[dataOffset + 7] = y2;
         vertexData[dataOffset + 8] = x2;
         vertexData[dataOffset + 9] = y1;
         vertexData[dataOffset + 10] = x2;
         vertexData[dataOffset + 11] = y2;
         borderIdx++;
      }

      // Left border
      if (leftTile !== null && !leftTile.isWall) {
         const x1 = Camera.calculateXCanvasPosition(tile.x * SETTINGS.TILE_SIZE);
         const x2 = Camera.calculateXCanvasPosition(tile.x * SETTINGS.TILE_SIZE + BORDER_THICKNESS);
         const y1 = Camera.calculateYCanvasPosition(tile.y * SETTINGS.TILE_SIZE - bottomOvershoot);
         const y2 = Camera.calculateYCanvasPosition((tile.y + 1) * SETTINGS.TILE_SIZE + topOvershoot);
         const dataOffset = borderIdx * 2 * 6;
         vertexData[dataOffset] = x1;
         vertexData[dataOffset + 1] = y1;
         vertexData[dataOffset + 2] = x2;
         vertexData[dataOffset + 3] = y1;
         vertexData[dataOffset + 4] = x1;
         vertexData[dataOffset + 5] = y2;
         vertexData[dataOffset + 6] = x1;
         vertexData[dataOffset + 7] = y2;
         vertexData[dataOffset + 8] = x2;
         vertexData[dataOffset + 9] = y1;
         vertexData[dataOffset + 10] = x2;
         vertexData[dataOffset + 11] = y2;
         borderIdx++;
      }

      // Bottom border
      if (tile.y > 0) {
         const bottomTile = Board.getTile(tile.x, tile.y - 1)
         if (!bottomTile.isWall) {
            const x1 = Camera.calculateXCanvasPosition(tile.x * SETTINGS.TILE_SIZE - leftOvershoot);
            const x2 = Camera.calculateXCanvasPosition((tile.x + 1) * SETTINGS.TILE_SIZE + rightOvershoot);
            const y1 = Camera.calculateYCanvasPosition(tile.y * SETTINGS.TILE_SIZE);
            const y2 = Camera.calculateYCanvasPosition(tile.y * SETTINGS.TILE_SIZE + BORDER_THICKNESS);
            const dataOffset = borderIdx * 2 * 6;
            vertexData[dataOffset] = x1;
            vertexData[dataOffset + 1] = y1;
            vertexData[dataOffset + 2] = x2;
            vertexData[dataOffset + 3] = y1;
            vertexData[dataOffset + 4] = x1;
            vertexData[dataOffset + 5] = y2;
            vertexData[dataOffset + 6] = x1;
            vertexData[dataOffset + 7] = y2;
            vertexData[dataOffset + 8] = x2;
            vertexData[dataOffset + 9] = y1;
            vertexData[dataOffset + 10] = x2;
            vertexData[dataOffset + 11] = y2;
            borderIdx++;
         }
      }

      // Right border
      if (tile.x < SETTINGS.BOARD_DIMENSIONS - 1) {
         const rightTile = Board.getTile(tile.x + 1, tile.y)
         if (!rightTile.isWall) {
            const x1 = Camera.calculateXCanvasPosition((tile.x + 1) * SETTINGS.TILE_SIZE - BORDER_THICKNESS);
            const x2 = Camera.calculateXCanvasPosition((tile.x + 1) * SETTINGS.TILE_SIZE);
            const y1 = Camera.calculateYCanvasPosition(tile.y * SETTINGS.TILE_SIZE - bottomOvershoot);
            const y2 = Camera.calculateYCanvasPosition((tile.y + 1) * SETTINGS.TILE_SIZE + topOvershoot);
            const dataOffset = borderIdx * 2 * 6;
            vertexData[dataOffset] = x1;
            vertexData[dataOffset + 1] = y1;
            vertexData[dataOffset + 2] = x2;
            vertexData[dataOffset + 3] = y1;
            vertexData[dataOffset + 4] = x1;
            vertexData[dataOffset + 5] = y2;
            vertexData[dataOffset + 6] = x1;
            vertexData[dataOffset + 7] = y2;
            vertexData[dataOffset + 8] = x2;
            vertexData[dataOffset + 9] = y1;
            vertexData[dataOffset + 10] = x2;
            vertexData[dataOffset + 11] = y2;
            borderIdx++;
         }
      }
   }

   gl.useProgram(program);

   // Create buffer
   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   // Enable the attributes
   gl.enableVertexAttribArray(0);

   // Draw the vertices
   gl.drawArrays(gl.TRIANGLES, 0, wallTiles.length * 6 * 4);
}