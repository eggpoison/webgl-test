import { SETTINGS } from "webgl-test-shared";
import Camera from "../Camera";
import { Tile } from "../Tile";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import Board from "../Board";

const BORDER_THICKNESS = 5;

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
   outputColour = vec4(0.15, 0.15, 0.15, 1.0);
}
`;

let program: WebGLProgram;

export function createWallBorderShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
}

export function renderWallBorders(): void {
   // 
   // Find visible wall tiles
   // 

   const minTileX = Camera.minVisibleChunkX * SETTINGS.CHUNK_SIZE;
   const maxTileX = (Camera.maxVisibleChunkX + 1) * SETTINGS.CHUNK_SIZE - 1;
   const minTileY = Camera.minVisibleChunkY * SETTINGS.CHUNK_SIZE;
   const maxTileY = (Camera.maxVisibleChunkY + 1) * SETTINGS.CHUNK_SIZE - 1;

   // @Speed: This shouldn't have to loop over all visible tiles
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
         const x1 = tile.x * SETTINGS.TILE_SIZE - leftOvershoot;
         const x2 = (tile.x + 1) * SETTINGS.TILE_SIZE + rightOvershoot;
         const y1 = (tile.y + 1) * SETTINGS.TILE_SIZE - BORDER_THICKNESS;
         const y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;
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
         const x1 = tile.x * SETTINGS.TILE_SIZE;
         const x2 = tile.x * SETTINGS.TILE_SIZE + BORDER_THICKNESS;
         const y1 = tile.y * SETTINGS.TILE_SIZE - bottomOvershoot;
         const y2 = (tile.y + 1) * SETTINGS.TILE_SIZE + topOvershoot;
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
            const x1 = tile.x * SETTINGS.TILE_SIZE - leftOvershoot;
            const x2 = (tile.x + 1) * SETTINGS.TILE_SIZE + rightOvershoot;
            const y1 = tile.y * SETTINGS.TILE_SIZE;
            const y2 = tile.y * SETTINGS.TILE_SIZE + BORDER_THICKNESS;
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
            const x1 = (tile.x + 1) * SETTINGS.TILE_SIZE - BORDER_THICKNESS;
            const x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
            const y1 = tile.y * SETTINGS.TILE_SIZE - bottomOvershoot;
            const y2 = (tile.y + 1) * SETTINGS.TILE_SIZE + topOvershoot;
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