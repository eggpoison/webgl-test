import { gl } from ".";
import Chunk from "./Chunk";
import TransformComponent from "./entity-components/TransformComponent";
import Entity from "./entities/Entity";
import { getTexture } from "./textures";
import { Tile, TileInfo, SETTINGS } from "webgl-test-shared";
import { Coordinates } from "./utils";
import Camera from "./Camera";
import { TILE_TYPE_INFO_RECORD } from "./tile-type-info";
import { createWebGLProgram } from "./webgl";

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

type TileVerticesCollection = {
   readonly texturedTriangleVertices: { [key: string]: Array<number> };
   readonly colouredTriangleVertices: Array<number>;
};

type TileVertexCoordinates = [{ [key: number]: number }, { [key: number]: number }];

abstract class Board {
   private static tiles: Array<Array<Tile>>;

   private static chunks: Array<Array<Chunk>>;

   private static solidTileProgram: WebGLProgram;
   private static liquidTileProgram: WebGLProgram;
   private static borderTileProgram: WebGLProgram;

   public static setup(tiles: Array<Array<Tile>>): void {
      this.tiles = tiles;

      // Initialise chunks array
      this.initialiseChunkArray();

      this.solidTileProgram = createWebGLProgram(solidTileVertexShaderText, solidTileFragmentShaderText);
      this.liquidTileProgram = createWebGLProgram(liquidTileVertexShaderText, liquidTileFragmentShaderText);
      this.borderTileProgram = createWebGLProgram(borderVertexShaderText, borderFragmentShaderText);
   }

   private static initialiseChunkArray(): void {
      this.chunks = new Array<Array<Chunk>>(SETTINGS.BOARD_SIZE);

      for (let x = 0; x < SETTINGS.BOARD_SIZE; x++) {
         this.chunks[x] = new Array<Chunk>(SETTINGS.BOARD_SIZE);
         for (let y = 0; y < SETTINGS.BOARD_SIZE; y++) {
            this.chunks[x][y] = new Chunk();
         }
      }
   }

   public static getChunk(x: number, y: number): Chunk {
      return this.chunks[x][y];
   }

   public static getTile(x: number, y: number): TileInfo {
      return this.tiles[x][y];
   }

   public static update(): void {
      const entityChunkChanges = new Array<[entity: Entity, previousChunkCoordinates: Coordinates, newChunkCoordinates: Coordinates]>();

      for (let x = 0; x < SETTINGS.BOARD_SIZE; x++) {
         for (let y = 0; y < SETTINGS.BOARD_SIZE; y++) {
            const chunk = this.getChunk(x, y);

            const entities = chunk.getEntities().slice();
            for (const entity of entities) {
               const transformComponent = entity.getComponent(TransformComponent)!;
               const chunkCoordinatesBeforeTick = transformComponent.getChunkCoordinates();

               entity.tick();

               // If the entity has changed chunks, add it to the list
               const chunkCoordinatesAfterTick = transformComponent.getChunkCoordinates();
               if (chunkCoordinatesBeforeTick[0] !== chunkCoordinatesAfterTick[0] || chunkCoordinatesBeforeTick[1] !== chunkCoordinatesAfterTick[1]) {
                  entityChunkChanges.push([entity, chunkCoordinatesBeforeTick, chunkCoordinatesAfterTick]);
               }
            }
         }
      }

      // Apply entity chunk changes
      for (const [entity, previousChunkCoordinates, newChunkCoordinates] of entityChunkChanges) {
         this.getChunk(...previousChunkCoordinates).removeEntity(entity);

         const newChunk = this.getChunk(...newChunkCoordinates);
         newChunk.addEntity(entity);
         entity.previousChunk = newChunk;
      }
   }

   public static render(): void {
      this.renderTiles();
      this.renderBorder();
      this.renderEntities();
   }

   private static renderTiles(): void {
      // Calculate tile vertices
      const tileVerticesCollection = this.calculateTileVertices();
      const texturedTriangleVertices = tileVerticesCollection.texturedTriangleVertices;
      const colouredTriangleVertices = tileVerticesCollection.colouredTriangleVertices;

      // Render solid tiles

      gl.useProgram(this.solidTileProgram);

      const entries = Object.entries(texturedTriangleVertices) as Array<[string, Array<number>]>;
      for (const [textureSource, vertices] of entries) {
         // Create tile buffer
         const tileBuffer = gl.createBuffer()!;
         gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

         const positionAttribLocation = gl.getAttribLocation(this.solidTileProgram, "vertPosition");
         const texCoordAttribLocation = gl.getAttribLocation(this.solidTileProgram, "vertTexCoord");
         gl.vertexAttribPointer(
            positionAttribLocation, // Attribute location
            2, // Number of elements per attribute
            gl.FLOAT, // Type of elements
            false,
            4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
            0 // Offset from the beginning of a single vertex to this attribute
         );
         gl.vertexAttribPointer(
            texCoordAttribLocation, // Attribute location
            2, // Number of elements per attribute
            gl.FLOAT, // Type of elements
            false,
            4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
            2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
         );
   
         // Enable the attributes
         gl.enableVertexAttribArray(positionAttribLocation);
         gl.enableVertexAttribArray(texCoordAttribLocation);
         
         // Set the texture
         const texture = getTexture(textureSource);
         gl.bindTexture(gl.TEXTURE_2D, texture);
         gl.activeTexture(gl.TEXTURE0);

         // Draw the tile
         gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
      }

      // Render liquids

      gl.useProgram(this.liquidTileProgram);

      // Create tile buffer
      const tileBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colouredTriangleVertices), gl.STATIC_DRAW);

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
      gl.drawArrays(gl.TRIANGLES, 0, colouredTriangleVertices.length / 5);
   }

   private static calculateTileVertices(): TileVerticesCollection {
      // Get chunk bounds
      const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();
      const minTileX = minChunkX * SETTINGS.CHUNK_SIZE;
      const maxTileX = (maxChunkX + 1) * SETTINGS.CHUNK_SIZE;
      const minTileY = minChunkY * SETTINGS.CHUNK_SIZE;
      const maxTileY = (maxChunkY + 1) * SETTINGS.CHUNK_SIZE;

      const tileVertexCoordinates = this.calculateTileVertexCoordinates(minTileX, maxTileX, minTileY, maxTileY);

      const texturedTriangleVertices: { [key: string]: Array<number> } = {};
      let colouredTriangleVertices = new Array<number>();

      // Calculate vertices
      for (let x = minTileX; x < maxTileX; x++) {
         for (let y = minTileY; y < maxTileY; y++) {
            // Get the tile data
            const tile = this.getTile(x, y);
            const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type];

            const x1 = tileVertexCoordinates[0][x];
            const x2 = tileVertexCoordinates[0][x + 1];
            const y1 = tileVertexCoordinates[1][y];
            const y2 = tileVertexCoordinates[1][y + 1];
            
            // Add the vertices to its appropriate section
            if (tileTypeInfo.isLiquid) {
               colouredTriangleVertices.push(
                  ...this.calculateLiquidTileVertices(x1, x2, y1, y2, tileTypeInfo.colour)
               );
            } else {
               const vertices = this.calculateSolidTileVertices(x1, x2, y1, y2);
   
               if (!texturedTriangleVertices.hasOwnProperty(tileTypeInfo.textureSource)) {
                  texturedTriangleVertices[tileTypeInfo.textureSource] = new Array<number>();
               }
               
               for (const vertex of vertices) {
                  texturedTriangleVertices[tileTypeInfo.textureSource].push(vertex);
               }
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
         const screenX = Camera.getXPositionInCanvas(x, "game");
         tileVertexCoordinates[0][tileX] = screenX;
      }
      // Y
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const y = tileY * SETTINGS.TILE_SIZE;
         const screenY = Camera.getYPositionInCanvas(y, "game");
         tileVertexCoordinates[1][tileY] = screenY;
      }

      return tileVertexCoordinates;
   }

   private static calculateSolidTileVertices(x1: number, x2: number, y1: number, y2: number): Array<number> {
      return [
         x1, y1, 0, 0,
         x2, y1, 1, 0,
         x1, y2, 0, 1,
         x1, y2, 0, 1,
         x2, y1, 1, 0,
         x2, y2, 1, 1
      ];
   }

   private static calculateLiquidTileVertices(x1: number, x2: number, y1: number, y2: number, [r, g, b]: [number, number, number]): Array<number> {
      return [
         x1, y1, r, g, b,
         x2, y1, r, g, b,
         x1, y2, r, g, b,
         x1, y2, r, g, b,
         x2, y1, r, g, b,
         x2, y2, r, g, b
      ];
   }

   private static renderBorder(): void {
      const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

      const BORDER_WIDTH = 5;

      gl.useProgram(this.borderTileProgram);

      const positionAttribLocation = gl.getAttribLocation(this.borderTileProgram, "vertPosition");
      gl.vertexAttribPointer(
         positionAttribLocation, // Attribute location
         2, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         2 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         0 // Offset from the beginning of a single vertex to this attribute
      );
   
      // Enable the attributes
      gl.enableVertexAttribArray(positionAttribLocation);

      const minChunkXPos = minChunkX * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;
      const maxChunkXPos = (maxChunkX + 1) * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;
      const minChunkYPos = minChunkY * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;
      const maxChunkYPos = (maxChunkY + 1) * SETTINGS.CHUNK_SIZE * SETTINGS.TILE_SIZE;

      const vertices = new Array<number>();

      if (minChunkX === 0) {
         const x1 = minChunkXPos - BORDER_WIDTH;
         const x2 = minChunkXPos;
         const y1 = minChunkYPos - BORDER_WIDTH;
         const y2 = maxChunkYPos + BORDER_WIDTH;

         // Calculate screen positions
         const screenX1 = Camera.getXPositionInCanvas(x1, "game");
         const screenX2 = Camera.getXPositionInCanvas(x2, "game");
         const screenY1 = Camera.getYPositionInCanvas(y1, "game");
         const screenY2 = Camera.getYPositionInCanvas(y2, "game");

         vertices.push(
            screenX1, screenY1,
            screenX2, screenY2,
            screenX1, screenY2,
            screenX1, screenY1,
            screenX2, screenY1,
            screenX2, screenY2
         );
      }

      if (maxChunkX === SETTINGS.BOARD_SIZE - 1) {
         const x1 = maxChunkXPos;
         const x2 = maxChunkXPos + BORDER_WIDTH;
         const y1 = minChunkYPos - BORDER_WIDTH;
         const y2 = maxChunkYPos + BORDER_WIDTH;

         // Calculate screen positions
         const screenX1 = Camera.getXPositionInCanvas(x1, "game");
         const screenX2 = Camera.getXPositionInCanvas(x2, "game");
         const screenY1 = Camera.getYPositionInCanvas(y1, "game");
         const screenY2 = Camera.getYPositionInCanvas(y2, "game");

         vertices.push(
            screenX1, screenY1,
            screenX2, screenY2,
            screenX1, screenY2,
            screenX1, screenY1,
            screenX2, screenY1,
            screenX2, screenY2
         );
      }

      if (minChunkY === 0) {
         const x1 = minChunkXPos - BORDER_WIDTH;
         const x2 = maxChunkXPos + BORDER_WIDTH;
         const y1 = minChunkYPos - BORDER_WIDTH;
         const y2 = minChunkYPos;

         // Calculate screen positions
         const screenX1 = Camera.getXPositionInCanvas(x1, "game");
         const screenX2 = Camera.getXPositionInCanvas(x2, "game");
         const screenY1 = Camera.getYPositionInCanvas(y1, "game");
         const screenY2 = Camera.getYPositionInCanvas(y2, "game");

         vertices.push(
            screenX1, screenY1,
            screenX2, screenY2,
            screenX1, screenY2,
            screenX1, screenY1,
            screenX2, screenY1,
            screenX2, screenY2
         );
      }

      if (maxChunkY === SETTINGS.BOARD_SIZE - 1) {
         const x1 = minChunkXPos - BORDER_WIDTH;
         const x2 = maxChunkXPos + BORDER_WIDTH;
         const y1 = maxChunkYPos;
         const y2 = maxChunkYPos + BORDER_WIDTH;

         // Calculate screen positions
         const screenX1 = Camera.getXPositionInCanvas(x1, "game");
         const screenX2 = Camera.getXPositionInCanvas(x2, "game");
         const screenY1 = Camera.getYPositionInCanvas(y1, "game");
         const screenY2 = Camera.getYPositionInCanvas(y2, "game");

         vertices.push(
            screenX1, screenY1,
            screenX2, screenY2,
            screenX1, screenY2,
            screenX1, screenY1,
            screenX2, screenY1,
            screenX2, screenY2
         );
      }

      const buffer = gl.createBuffer()!;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
   }

   private static renderEntities(): void {
      for (let x = 0; x < SETTINGS.BOARD_SIZE; x++) {
         for (let y = 0; y < SETTINGS.BOARD_SIZE; y++) {
            const chunk = this.getChunk(x, y);

            const entities = chunk.getEntities();
            for (const entity of entities) {
               entity.render();
            }
         }
      }
   }

   private static getEntityChunk(entity: Entity): Chunk {
      // Get the chunk
      const entityPositionComponent = entity.getComponent(TransformComponent)!;
      const chunk = entityPositionComponent.getChunk()!;
      return chunk;
   }

   public static addEntity(entity: Entity): void {
      const chunk = this.getEntityChunk(entity);

      // If the entity's spawn position is outside the board, don't add it
      if (chunk === null) return;

      if (typeof entity.onLoad !== "undefined") entity.onLoad();
      entity.loadComponents();

      // Add the entity to the chunk
      chunk.addEntity(entity);

      // Update the entity's previous chunk
      entity.previousChunk = chunk;
   }

   public static removeEntity(entity: Entity): void {
      // Remove the entity from its chunk
      const chunk = entity.previousChunk!;
      chunk.removeEntity(entity);
   }
}

export default Board;