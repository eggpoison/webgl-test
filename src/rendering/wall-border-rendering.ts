import { SETTINGS } from "webgl-test-shared";
import Camera from "../Camera";
import Game from "../Game";
import { Tile } from "../Tile";
import { createWebGLProgram, gl } from "../webgl";

const BORDER_THICKNESS = 3;

const vertexShaderText = `
precision mediump float;

attribute vec2 a_position;

void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderText = `
precision mediump float;

void main() {
   gl_FragColor = vec4(0.15, 0.15, 0.15, 1.0);
}
`;

let program: WebGLProgram;

let positionAttribLocation: GLint;

export function createWallBorderShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText);

   positionAttribLocation = gl.getAttribLocation(program, "a_position");
}

const getVisibleTiles = (): ReadonlyArray<Tile> => {
   const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

   const minTileX = minChunkX * SETTINGS.CHUNK_SIZE;
   const maxTileX = (maxChunkX + 1) * SETTINGS.CHUNK_SIZE - 1;
   const minTileY = minChunkY * SETTINGS.CHUNK_SIZE;
   const maxTileY = (maxChunkY + 1) * SETTINGS.CHUNK_SIZE - 1;

   const tiles = new Array<Tile>();
   
   for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         const tile = Game.board.getTile(tileX, tileY);
         tiles.push(tile);
      }
   }

   return tiles;
}

export function renderWallBorders(): void {
   const visibleTiles = getVisibleTiles();

   // Create vertices
   const vertices = new Array<number>();
   for (const tile of visibleTiles) {
      if (!tile.isWall) continue;

      const topTile = tile.y < SETTINGS.BOARD_DIMENSIONS - 1 ? Game.board.getTile(tile.x, tile.y + 1) : null;
      const leftTile = tile.x > 0 ? Game.board.getTile(tile.x - 1, tile.y) : null;
      const bottomTile = tile.y > 0 ? Game.board.getTile(tile.x, tile.y - 1) : null;
      const rightTile = tile.x < SETTINGS.BOARD_DIMENSIONS - 1 ? Game.board.getTile(tile.x + 1, tile.y) : null;

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
         vertices.push(
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2
         );
      }

      // Left border
      if (leftTile !== null && !leftTile.isWall) {
         const x1 = Camera.calculateXCanvasPosition(tile.x * SETTINGS.TILE_SIZE);
         const x2 = Camera.calculateXCanvasPosition(tile.x * SETTINGS.TILE_SIZE + BORDER_THICKNESS);
         const y1 = Camera.calculateYCanvasPosition(tile.y * SETTINGS.TILE_SIZE - bottomOvershoot);
         const y2 = Camera.calculateYCanvasPosition((tile.y + 1) * SETTINGS.TILE_SIZE + topOvershoot);
         vertices.push(
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2
         );
      }

      // Bottom border
      if (tile.y > 0) {
         const bottomTile = Game.board.getTile(tile.x, tile.y - 1)
         if (!bottomTile.isWall) {
            const x1 = Camera.calculateXCanvasPosition(tile.x * SETTINGS.TILE_SIZE - leftOvershoot);
            const x2 = Camera.calculateXCanvasPosition((tile.x + 1) * SETTINGS.TILE_SIZE + rightOvershoot);
            const y1 = Camera.calculateYCanvasPosition(tile.y * SETTINGS.TILE_SIZE);
            const y2 = Camera.calculateYCanvasPosition(tile.y * SETTINGS.TILE_SIZE + BORDER_THICKNESS);
            vertices.push(
               x1, y1,
               x2, y1,
               x1, y2,
               x1, y2,
               x2, y1,
               x2, y2
            );
         }
      }

      // Right border
      if (tile.x < SETTINGS.BOARD_DIMENSIONS - 1) {
         const rightTile = Game.board.getTile(tile.x + 1, tile.y)
         if (!rightTile.isWall) {
            const x1 = Camera.calculateXCanvasPosition((tile.x + 1) * SETTINGS.TILE_SIZE - BORDER_THICKNESS);
            const x2 = Camera.calculateXCanvasPosition((tile.x + 1) * SETTINGS.TILE_SIZE);
            const y1 = Camera.calculateYCanvasPosition(tile.y * SETTINGS.TILE_SIZE - bottomOvershoot);
            const y2 = Camera.calculateYCanvasPosition((tile.y + 1) * SETTINGS.TILE_SIZE + topOvershoot);
            vertices.push(
               x1, y1,
               x2, y1,
               x1, y2,
               x1, y2,
               x2, y1,
               x2, y2
            );
         }
      }
   }

   gl.useProgram(program);

   if (vertices.length === 0) return;
      
   // Create buffer
   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   // Enable the attributes
   gl.enableVertexAttribArray(positionAttribLocation);

   // Draw the vertices
   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}