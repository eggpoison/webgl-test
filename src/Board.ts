import Entity from "./entities/Entity";
import { getTexture } from "./textures";
import { SETTINGS, Point, Vector, ServerTileUpdateData, rotatePoint, TILE_TYPE_INFO_RECORD, } from "webgl-test-shared";
import Camera from "./Camera";
import { LiquidTileTypeRenderInfo, SolidTileTypeRenderInfo, TILE_TYPE_RENDER_INFO_RECORD } from "./tile-type-render-info";
import { createWebGLProgram, gl, halfWindowHeight, halfWindowWidth } from "./webgl";
import Chunk from "./Chunk";
import ItemEntity from "./ItemEntity";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { Tile } from "./Tile";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import Player from "./entities/Player";

// 
// Solid Tile Shaders
// 
const solidTileVertexShaderText = `
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
const solidTileFragmentShaderText = `
precision mediump float;

uniform sampler2D u_texture;

varying vec2 v_texCoord;
 
void main() {
   gl_FragColor = texture2D(u_texture, v_texCoord);
}
`;

// 
// Liquid Tile Shaders
// 
const liquidTileVertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;
attribute vec3 vertColour;

varying vec3 fragColour;
 
void main() {
   fragColour = vertColour;
   
   gl_Position = vec4(vertPosition, 0.0, 1.0);
}
`;
const liquidTileFragmentShaderText = `
precision mediump float;
 
uniform sampler2D sampler;
 
varying vec3 fragColour;
 
void main() {
   gl_FragColor = vec4(fragColour, 1.0);
}
`;

// 
// Border shaders
// 
const borderVertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;

void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);
}`;
const borderFragmentShaderText = `
precision mediump float;

void main() {
   gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

// 
// Chunk border wireframe shaders
// 
const chunkBorderColour = "1.0, 0.0, 0.0";
const chunkBorderVertexShaderText = `
precision lowp float;

attribute vec2 vertPosition;

void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);
}`;
const chunkBorderFragmentShaderText = `
precision mediump float;

void main() {
   gl_FragColor = vec4(${chunkBorderColour}, 1.0);
}
`;

// 
// Item shaders
// 
const itemVertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;
attribute vec2 vertTexCoord;

varying vec2 fragTexCoord;
 
void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);

   fragTexCoord = vertTexCoord;
}
`;
const itemFragmentShaderText = `
precision mediump float;
 
uniform sampler2D sampler;
 
varying vec2 fragTexCoord;
 
void main() {
   gl_FragColor = texture2D(sampler, fragTexCoord);
}
`;

export type EntityHitboxInfo = {
   readonly vertexPositions: readonly [Point, Point, Point, Point];
   readonly sideAxes: ReadonlyArray<Vector>
}

class Board {
   private tiles: Array<Array<Tile>>;
   private chunks: Array<Array<Chunk>>;

   public entities: Record<number, Entity> = {};
   public items: Record<number, ItemEntity> = {};

   private solidTileProgram: WebGLProgram;
   private liquidTileProgram: WebGLProgram;
   private borderProgram: WebGLProgram;
   private chunkBorderProgram: WebGLProgram;
   private itemProgram: WebGLProgram;

   private solidTileProgramPlayerPosUniformLocation: WebGLUniformLocation;
   private solidTileProgramHalfWindowSizeUniformLocation: WebGLUniformLocation;
   private solidTileProgramTextureUniformLocation: WebGLUniformLocation;

   private solidTileProgramTilePosAttribLocation: GLint;
   private solidTileProgramTexCoordAttribLocation: GLint;

   private solidTileVertexCounts = new Array<number>();
   private solidTileBuffers = new Array<WebGLBuffer>();
   private solidTileIndexedTextureSources = new Array<string>();

   constructor(tiles: Array<Array<Tile>>) {
      this.tiles = tiles;
      
      // Create the chunk array
      this.chunks = new Array<Array<Chunk>>();
      for (let x = 0; x < SETTINGS.BOARD_SIZE; x++) {
         this.chunks[x] = new Array<Chunk>();
         for (let y = 0; y < SETTINGS.BOARD_SIZE; y++) {
            this.chunks[x][y] = new Chunk(x, y);
         }
      }

      this.updateSolidTileData();

      this.solidTileProgram = createWebGLProgram(solidTileVertexShaderText, solidTileFragmentShaderText, "a_tilePos");
      this.liquidTileProgram = createWebGLProgram(liquidTileVertexShaderText, liquidTileFragmentShaderText);
      this.borderProgram = createWebGLProgram(borderVertexShaderText, borderFragmentShaderText);
      this.chunkBorderProgram = createWebGLProgram(chunkBorderVertexShaderText, chunkBorderFragmentShaderText);
      this.itemProgram = createWebGLProgram(itemVertexShaderText, itemFragmentShaderText);

      this.solidTileProgramPlayerPosUniformLocation = gl.getUniformLocation(this.solidTileProgram, "u_playerPos")!;
      this.solidTileProgramHalfWindowSizeUniformLocation = gl.getUniformLocation(this.solidTileProgram, "u_halfWindowSize")!;
      this.solidTileProgramTextureUniformLocation = gl.getUniformLocation(this.solidTileProgram, "u_texture")!;

      this.solidTileProgramTilePosAttribLocation = gl.getAttribLocation(this.solidTileProgram, "a_tilePos");
      this.solidTileProgramTexCoordAttribLocation = gl.getAttribLocation(this.solidTileProgram, "a_texCoord");
   }

   public getTile(x: number, y: number): Tile {
      return this.tiles[x][y];
   }

   public getChunk(x: number, y: number): Chunk {
      return this.chunks[x][y];
   }

   public tickEntities(): void {
      for (const entity of Object.values(this.entities)) {
         entity.applyPhysics();
         if (typeof entity.tick !== "undefined") entity.tick();

         // Calculate the entity's new info
         for (const hitbox of entity.hitboxes) {
            if (hitbox.info.type === "rectangular") {
               (hitbox as RectangularHitbox).computeVertexPositions();
               (hitbox as RectangularHitbox).computeSideAxes();
            }
            hitbox.updateHitboxBounds();
         }

         // Update the entities' containing chunks
         const newChunks = entity.calculateContainingChunks();
         entity.updateChunks(newChunks);
         entity.updateChunks(newChunks);
      }
   }

   public resolveCollisions(): void {
      for (const entity of Object.values(this.entities)) {
         entity.resolveEntityCollisions();
         entity.resolveWallCollisions();
      }
   }

   /** Updates the client's copy of the tiles array to match any tile updates that have occurred */
   public loadTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const update of tileUpdates) {
         let tile = this.getTile(update.x, update.y);
         tile.type = update.type;
         tile.isWall = update.isWall;
      }
   }

   public renderTiles(): void {
      const visibleTiles = this.categoriseVisibleTiles();

      this.renderSolidTiles();
      
      const liquidTileVertices = this.calculateLiquidTileVertices(visibleTiles.liquidTiles);
      this.renderLiquidTiles(liquidTileVertices);
   }

   private categoriseVisibleTiles(): { solidTiles: ReadonlyArray<Tile>, liquidTiles: ReadonlyArray<Tile> } {
      const [minTileX, maxTileX, minTileY, maxTileY] = Camera.calculateVisibleTileBounds();
      const tiles = {
         solidTiles: new Array<Tile>(),
         liquidTiles: new Array<Tile>()
      };
      for (let x = minTileX; x <= maxTileX; x++) {
         for (let y = minTileY; y <= maxTileY; y++) {
            const tile = this.getTile(x, y);
            if (TILE_TYPE_INFO_RECORD[tile.type].isLiquid) {
               tiles.liquidTiles.push(tile);
            } else {
               tiles.solidTiles.push(tile);
            }
         }
      }

      return tiles;  
   }

   private renderSolidTiles(): void {
      gl.useProgram(this.solidTileProgram);

      for (let idx = 0; idx < this.solidTileBuffers.length; idx++) {
         const buffer = this.solidTileBuffers[idx];
         gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

         gl.vertexAttribPointer(
            this.solidTileProgramTilePosAttribLocation, // Attribute location
            2, // Number of elements per attribute
            gl.FLOAT, // Type of elements
            false,
            4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
            0 // Offset from the beginning of a single vertex to this attribute
         );
         gl.vertexAttribPointer(
            this.solidTileProgramTexCoordAttribLocation, // Attribute location
            2, // Number of elements per attribute
            gl.FLOAT, // Type of elements
            false,
            4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
            2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
         );
   
         gl.uniform2f(this.solidTileProgramPlayerPosUniformLocation, Camera.position.x, Camera.position.y);
         gl.uniform2f(this.solidTileProgramHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      
         // Enable the attributes
         gl.enableVertexAttribArray(this.solidTileProgramTilePosAttribLocation);
         gl.enableVertexAttribArray(this.solidTileProgramTexCoordAttribLocation);
   
         gl.uniform1i(this.solidTileProgramTextureUniformLocation, 0);
         
         // Set all texture units
         const texture = getTexture("tiles/" + this.solidTileIndexedTextureSources[idx]);
         gl.activeTexture(gl.TEXTURE0);
         gl.bindTexture(gl.TEXTURE_2D, texture);
   
         // Draw the tiles
         gl.drawArrays(gl.TRIANGLES, 0, this.solidTileVertexCounts[idx] / 4);
      }
   }

   private updateSolidTileData(): void {
      // Clear previous data
      this.solidTileBuffers = new Array<WebGLBuffer>();
      this.solidTileIndexedTextureSources = new Array<string>();
      this.solidTileVertexCounts = new Array<number>();

      // Categorize the tiles based on their texture
      const visibleTilesCategorized: { [textureSource: string]: Array<Tile> } = {};
      for (let x = 0; x < SETTINGS.BOARD_DIMENSIONS; x++) {
         for (let y = 0; y < SETTINGS.BOARD_DIMENSIONS; y++) {
            const tile = this.getTile(x, y);
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

         this.solidTileBuffers[idx] = buffer;
         this.solidTileVertexCounts[idx] = vertices.length;
         this.solidTileIndexedTextureSources[idx] = textureSource;

         idx++;
      }
   }

   private calculateLiquidTileVertices(tiles: ReadonlyArray<Tile>): ReadonlyArray<number> {
      const vertices = new Array<number>();

      for (const tile of tiles) {
         const x1 = tile.x * SETTINGS.TILE_SIZE;
         const x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
         const y1 = tile.y * SETTINGS.TILE_SIZE;
         const y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

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

      return vertices;
   }

   private renderLiquidTiles(vertices: ReadonlyArray<number>): void {
      gl.useProgram(this.liquidTileProgram);

      // Create tile buffer
      const tileBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      const positionAttribLocation = gl.getAttribLocation(this.liquidTileProgram, "vertPosition");
      const colourAttribLocation = gl.getAttribLocation(this.liquidTileProgram, "vertColour");
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

   public renderBorder(): void {
      const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

      const BORDER_WIDTH = 20;

      gl.useProgram(this.borderProgram);

      const positionAttribLocation = gl.getAttribLocation(this.borderProgram, "vertPosition");
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

   public drawChunkBorders(): void {
      gl.useProgram(this.chunkBorderProgram);
      
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

      const positionAttribLocation = gl.getAttribLocation(this.chunkBorderProgram, "vertPosition");
      gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   
      gl.enableVertexAttribArray(positionAttribLocation);

      const buffer = gl.createBuffer()!;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

      gl.drawArrays(gl.LINES, 0, vertices.length / 2);
   }

   public removeEntity(entity: Entity): void {
      delete this.entities[entity.id];

      for (const chunk of entity.chunks) {
         chunk.removeEntity(entity);
      }
   }

   public calculateDistanceBetweenPointAndEntity(position: Point, entity: Entity): number {
      let minDist = Number.MAX_SAFE_INTEGER;
      for (const hitbox of entity.hitboxes) {
         let distance: number;
         switch (hitbox.info.type) {
            case "circular": {
               const dist = position.calculateDistanceBetween(entity.position);
               distance = dist - hitbox.info.radius;
               break;
            }
            case "rectangular": {
               // Rotate the objects to axis-align the rectangle
               const rotatedPositon = rotatePoint(position, entity.position, -entity.rotation);

               const distanceX = Math.max(Math.abs(rotatedPositon.x - entity.position.x) - hitbox.info.width / 2, 0);
               const distanceY = Math.max(Math.abs(rotatedPositon.y - entity.position.y) - hitbox.info.height / 2, 0);
               distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            }
         }
         if (distance < minDist) {
            minDist = distance;
         }
      }

      return minDist;
   }

   public renderItems(): void {
      gl.useProgram(this.itemProgram);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const itemVertexRecord = this.calculateItemVertices();

      for (const [textureSrc, vertices] of Object.entries(itemVertexRecord)) {
         const buffer = gl.createBuffer()!;
         gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

         const positionAttribLocation = gl.getAttribLocation(this.itemProgram, "vertPosition");
         const texCoordAttribLocation = gl.getAttribLocation(this.itemProgram, "vertTexCoord");
         gl.vertexAttribPointer(
            positionAttribLocation,
            2,
            gl.FLOAT,
            false,
            4 * Float32Array.BYTES_PER_ELEMENT,
            0
         );
         gl.vertexAttribPointer(
            texCoordAttribLocation,
            2,
            gl.FLOAT,
            false,
            4 * Float32Array.BYTES_PER_ELEMENT,
            2 * Float32Array.BYTES_PER_ELEMENT
         );

         gl.enableVertexAttribArray(positionAttribLocation);
         gl.enableVertexAttribArray(texCoordAttribLocation);
         
         const texture = getTexture(`items/${textureSrc}`);
         gl.activeTexture(gl.TEXTURE0);
         gl.bindTexture(gl.TEXTURE_2D, texture);

         gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
      }

      gl.disable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ZERO);
   }

   private calculateItemVertices(): { [textureSrc: string]: ReadonlyArray<number> } {
      const itemVertexRecord: { [textureSrc: string]: Array<number> } = {};

      for (const item of Object.values(this.items)) {
         const textureSrc = CLIENT_ITEM_INFO_RECORD[item.type].textureSrc;

         if (!itemVertexRecord.hasOwnProperty(textureSrc)) {
            itemVertexRecord[textureSrc] = new Array<number>();
         }

         const x1 = item.position.x - SETTINGS.ITEM_SIZE;
         const x2 = item.position.x + SETTINGS.ITEM_SIZE;
         const y1 = item.position.y - SETTINGS.ITEM_SIZE;
         const y2 = item.position.y + SETTINGS.ITEM_SIZE;

         let topLeft = new Point(x1, y2);
         let topRight = new Point(x2, y2);
         let bottomRight = new Point(x2, y1);
         let bottomLeft = new Point(x1, y1);

         // Rotate
         topLeft = rotatePoint(topLeft, item.position, item.rotation);
         topRight = rotatePoint(topRight, item.position, item.rotation);
         bottomRight = rotatePoint(bottomRight, item.position, item.rotation);
         bottomLeft = rotatePoint(bottomLeft, item.position, item.rotation);

         topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
         topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
         bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));
         bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));
         
         itemVertexRecord[textureSrc].push(
            bottomLeft.x, bottomLeft.y, 0, 0,
            bottomRight.x, bottomRight.y, 1, 0,
            topLeft.x, topLeft.y, 0, 1,
            topLeft.x, topLeft.y, 0, 1,
            bottomRight.x, bottomRight.y, 1, 0,
            topRight.x, topRight.y, 1, 1
         );
      }

      return itemVertexRecord;
   }
}

export default Board;