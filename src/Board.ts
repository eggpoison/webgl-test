import Entity from "./entities/Entity";
import { getTexture } from "./textures";
import { SETTINGS, computeSideAxis, Point, Vector, ServerTileUpdateData, rotatePoint, } from "webgl-test-shared";
import Camera from "./Camera";
import { TILE_TYPE_RENDER_INFO_RECORD } from "./tile-type-render-info";
import { createWebGLProgram, gl } from "./webgl";
import Chunk from "./Chunk";
import Item from "./Item";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { Tile } from "./Tile";

// 
// Solid Tile Shaders
// 
const solidTileVertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;
attribute vec2 vertTexCoord;

varying vec2 fragTexCoord;
 
void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);

   fragTexCoord = vertTexCoord;
}
`;
const solidTileFragmentShaderText = `
precision mediump float;
 
uniform sampler2D sampler;
 
varying vec2 fragTexCoord;
 
void main() {
   gl_FragColor = texture2D(sampler, fragTexCoord);
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
// Chunk border shaders
// 
const chunkBorderVertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;

void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);
}`;
const chunkBorderFragmentShaderText = `
precision mediump float;

void main() {
   gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
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

type TileVerticesCollection = {
   readonly texturedTriangleVertices: { [key: string]: Array<number> };
   readonly colouredTriangleVertices: Array<number>;
};

type TileVertexCoordinates = [{ [key: number]: number }, { [key: number]: number }];

export type EntityHitboxInfo = {
   readonly vertexPositions: readonly [Point, Point, Point, Point];
   readonly sideAxes: ReadonlyArray<Vector>
}

abstract class Board {
   private static tiles: Array<Array<Tile>>;

   private static chunks = this.createChunkArray();

   public static entities: Record<number, Entity> = {};
   
   public static items: Record<number, Item> = {};

   private static solidTileProgram: WebGLProgram;
   private static liquidTileProgram: WebGLProgram;
   private static borderProgram: WebGLProgram;
   private static chunkBorderProgram: WebGLProgram;
   private static itemProgram: WebGLProgram;

   private static solidTileProgramPositionAttribLocation: GLint;
   private static solidTileProgramTexCoordAttribLocation: GLint;

   private static createChunkArray(): Array<Array<Chunk>> {
      const chunks = new Array<Array<Chunk>>();

      for (let x = 0; x < SETTINGS.BOARD_SIZE; x++) {
         chunks[x] = new Array<Chunk>();
         for (let y = 0; y < SETTINGS.BOARD_SIZE; y++) {
            chunks[x][y] = new Chunk(x, y);
         }
      }

      return chunks;
   }

   public static setTiles(tiles: Array<Array<Tile>>): void {
      this.tiles = tiles;
   }

   public static setupShaders(): void {
      this.solidTileProgram = createWebGLProgram(solidTileVertexShaderText, solidTileFragmentShaderText);
      this.liquidTileProgram = createWebGLProgram(liquidTileVertexShaderText, liquidTileFragmentShaderText);
      this.borderProgram = createWebGLProgram(borderVertexShaderText, borderFragmentShaderText);
      this.chunkBorderProgram = createWebGLProgram(chunkBorderVertexShaderText, chunkBorderFragmentShaderText);
      this.itemProgram = createWebGLProgram(itemVertexShaderText, itemFragmentShaderText);

      this.precomputeAttribLocations();
   }

   public static getTile(x: number, y: number): Tile {
      return this.tiles[x][y];
   }

   public static getChunk(x: number, y: number): Chunk {
      return this.chunks[x][y];
   }

   public static update(): void {
      const entityHitboxInfoRecord: Record<number, EntityHitboxInfo> = {};

      for (const entity of Object.values(this.entities)) {
         entity.applyPhysics();
         if (typeof entity.tick !== "undefined") entity.tick();

         // Calculate the entity's new info
         const hitboxVertexPositons = entity.calculateHitboxVertexPositions();
         const hitboxBounds = entity.calculateHitboxBounds(hitboxVertexPositons);
         const newChunks = entity.calculateContainingChunks(hitboxBounds);

         // Update the entities' containing chunks
         entity.updateChunks(newChunks);

         if (hitboxVertexPositons !== null) {
            const sideAxes = [
               computeSideAxis(hitboxVertexPositons[0], hitboxVertexPositons[1]),
               computeSideAxis(hitboxVertexPositons[0], hitboxVertexPositons[2])
            ];

            entityHitboxInfoRecord[entity.id] = {
               vertexPositions: hitboxVertexPositons,
               sideAxes: sideAxes
            };
         }
      }

      for (const entity of Object.values(this.entities)) {
         entity.resolveCollisions(entityHitboxInfoRecord);

         // Resolve wall collisions
         const hitboxVertexPositons = entity.calculateHitboxVertexPositions();
         const hitboxBounds = entity.calculateHitboxBounds(hitboxVertexPositons);
         entity.resolveWallCollisions(hitboxBounds);
      }
   }

   /** Updates the client's copy of the tiles array to match any tile updates that have occurred */
   public static loadTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const update of tileUpdates) {
         let tile = this.getTile(update.x, update.y);
         tile.type = update.type;
         tile.isWall = update.isWall;
      }
   }

   private static precomputeAttribLocations(): void {
      this.solidTileProgramPositionAttribLocation = gl.getAttribLocation(this.solidTileProgram, "vertPosition");
      this.solidTileProgramTexCoordAttribLocation = gl.getAttribLocation(this.solidTileProgram, "vertTexCoord");
   }

   public static renderTiles(): void {
      // Calculate tile vertices
      const tileVerticesCollection = this.calculateTileVertices();

      this.renderSolidTiles(tileVerticesCollection.texturedTriangleVertices);
      this.renderLiquidTiles(tileVerticesCollection.colouredTriangleVertices);
   }

   private static renderSolidTiles(triangleVertices: { [textureSource: string]: Array<number> }): void {
      gl.useProgram(this.solidTileProgram);

      const entries = Object.entries(triangleVertices) as Array<[string, Array<number>]>;
      for (const [textureSource, vertices] of entries) {
         // Create tile buffer
         const tileBuffer = gl.createBuffer()!;
         gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

         gl.vertexAttribPointer(
            this.solidTileProgramPositionAttribLocation, // Attribute location
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
   
         // Enable the attributes
         gl.enableVertexAttribArray(this.solidTileProgramPositionAttribLocation);
         gl.enableVertexAttribArray(this.solidTileProgramTexCoordAttribLocation);
         
         // Set the texture
         const texture = getTexture("tiles/" + textureSource);
         gl.bindTexture(gl.TEXTURE_2D, texture);
         gl.activeTexture(gl.TEXTURE0);

         // Draw the tile
         gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
      }
   }

   private static renderLiquidTiles(triangleVertices: Array<number>): void {
      gl.useProgram(this.liquidTileProgram);

      // Create tile buffer
      const tileBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

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
      gl.drawArrays(gl.TRIANGLES, 0, triangleVertices.length / 5);
   }

   private static calculateTileVertices(): TileVerticesCollection {
      // Get chunk bounds
      const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();
      const minTileX = minChunkX * SETTINGS.CHUNK_SIZE;
      const maxTileX = (maxChunkX + 1) * SETTINGS.CHUNK_SIZE;
      const minTileY = minChunkY * SETTINGS.CHUNK_SIZE;
      const maxTileY = (maxChunkY + 1) * SETTINGS.CHUNK_SIZE;

      const [xTileVertexCoordinates, yTileVertexCoordinates] = this.calculateTileVertexCoordinates(minTileX, maxTileX, minTileY, maxTileY);

      const texturedTriangleVertices: { [key: string]: Array<number> } = {};
      let colouredTriangleVertices = new Array<number>();

      // Calculate vertices
      for (let x = minTileX; x < maxTileX; x++) {
         for (let y = minTileY; y < maxTileY; y++) {
            // Get the tile data
            const tile = this.getTile(x, y);
            const tileTypeInfo = TILE_TYPE_RENDER_INFO_RECORD[tile.type];

            const x1 = xTileVertexCoordinates[x];
            const x2 = xTileVertexCoordinates[x + 1];
            const y1 = yTileVertexCoordinates[y];
            const y2 = yTileVertexCoordinates[y + 1];
            
            // Add the vertices to its appropriate section
            if (tileTypeInfo.isLiquid) {
               const [r, g, b] = tileTypeInfo.colour;
               colouredTriangleVertices.push(
                  x1, y1, r, g, b,
                  x2, y1, r, g, b,
                  x1, y2, r, g, b,
                  x1, y2, r, g, b,
                  x2, y1, r, g, b,
                  x2, y2, r, g, b
               );
            } else {
               if (!texturedTriangleVertices.hasOwnProperty(tileTypeInfo.textureSource)) {
                  texturedTriangleVertices[tileTypeInfo.textureSource] = new Array<number>();
               }
               
               texturedTriangleVertices[tileTypeInfo.textureSource].push(
                  x1, y1, 0, 0,
                  x2, y1, 1, 0,
                  x1, y2, 0, 1,
                  x1, y2, 0, 1,
                  x2, y1, 1, 0,
                  x2, y2, 1, 1
               );
            }
         }
      }

      return {
         texturedTriangleVertices: texturedTriangleVertices,
         colouredTriangleVertices: colouredTriangleVertices
      };
   }

   private static calculateTileVertexCoordinates(minTileX: number, maxTileX: number, minTileY: number, maxTileY: number): TileVertexCoordinates {
      const tileVertexCoordinates: TileVertexCoordinates = [{}, {}];

      // X
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         const x = tileX * SETTINGS.TILE_SIZE;
         const screenX = Camera.getXPositionInScreen(x);
         tileVertexCoordinates[0][tileX] = screenX;
      }
      // Y
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const y = tileY * SETTINGS.TILE_SIZE;
         const screenY = Camera.getYPositionInScreen(y);
         tileVertexCoordinates[1][tileY] = screenY;
      }

      return tileVertexCoordinates;
   }

   public static drawBorder(): void {
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
         const screenX1 = Camera.getXPositionInScreen(x1);
         const screenX2 = Camera.getXPositionInScreen(x2);
         const screenY1 = Camera.getYPositionInScreen(y1);
         const screenY2 = Camera.getYPositionInScreen(y2);

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

   public static drawChunkBorders(): void {
      gl.useProgram(this.chunkBorderProgram);
      
      const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

      const vertices = new Array<number>();

      // Horizontal lines
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const screenY = Camera.getYPositionInScreen(chunkY * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
         vertices.push(
            -1, screenY,
            1, screenY
         );
      }

      // Vertical lines
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         const screenX = Camera.getXPositionInScreen(chunkX * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE);
         vertices.push(
            screenX, -1,
            screenX, 1
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

   public static removeEntity(entity: Entity): void {
      delete this.entities[entity.id];

      for (const chunk of entity.chunks) {
         chunk.removeEntity(entity);
      }
   }

   public static calculateDistanceBetweenPointAndEntity(position: Point, entity: Entity): number {
      switch (entity.hitbox.type) {
         case "circular": {
            const dist = position.distanceFrom(entity.position);
            return dist - entity.hitbox.radius;
         }
         case "rectangular": {
            // Rotate the objects to axis-align the rectangle
            const rotatedPositon = rotatePoint(position, entity.position, -entity.rotation);

            const distanceX = Math.max(Math.abs(rotatedPositon.x - entity.position.x) - entity.hitbox.width / 2, 0);
            const distanceY = Math.max(Math.abs(rotatedPositon.y - entity.position.y) - entity.hitbox.height / 2, 0);
            return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
         }
      }
   }

   public static renderItems(): void {
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
         gl.bindTexture(gl.TEXTURE_2D, texture);
         gl.activeTexture(gl.TEXTURE0);

         gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
      }

      gl.disable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ZERO);
   }

   private static calculateItemVertices(): { [textureSrc: string]: ReadonlyArray<number> } {
      const itemVertexRecord: { [textureSrc: string]: Array<number> } = {};

      for (const item of Object.values(this.items)) {
         const textureSrc = CLIENT_ITEM_INFO_RECORD[item.itemID].textureSrc;

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

         topLeft = new Point(Camera.getXPositionInScreen(topLeft.x), Camera.getYPositionInScreen(topLeft.y));
         topRight = new Point(Camera.getXPositionInScreen(topRight.x), Camera.getYPositionInScreen(topRight.y));
         bottomRight = new Point(Camera.getXPositionInScreen(bottomRight.x), Camera.getYPositionInScreen(bottomRight.y));
         bottomLeft = new Point(Camera.getXPositionInScreen(bottomLeft.x), Camera.getYPositionInScreen(bottomLeft.y));
               
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