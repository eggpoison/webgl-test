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

abstract class Board {
   private static tiles: Array<Array<Tile>>;

   private static chunks: Array<Array<Chunk>>;

   private static solidTileProgram: WebGLProgram;
   private static liquidTileProgram: WebGLProgram;

   public static setup(tiles: Array<Array<Tile>>): void {
      this.tiles = tiles;

      // Initialise chunks array
      this.initialiseChunkArray();

      this.solidTileProgram = createWebGLProgram(solidTileVertexShaderText, solidTileFragmentShaderText);
      this.liquidTileProgram = createWebGLProgram(liquidTileVertexShaderText, liquidTileFragmentShaderText);
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
         this.getChunk(...newChunkCoordinates).addEntity(entity);
      }
   }

   public static render(): void {
      this.renderTiles();
      this.renderEntities();
   }

   private static renderTiles(): void {
      // Get chunk bounds
      const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();
      const minTileX = minChunkX * SETTINGS.CHUNK_SIZE;
      const maxTileX = (maxChunkX + 1) * SETTINGS.CHUNK_SIZE;
      const minTileY = minChunkY * SETTINGS.CHUNK_SIZE;
      const maxTileY = (maxChunkY + 1) * SETTINGS.CHUNK_SIZE;

      const texturedTriangleVertices: { [key: string]: Array<number> } = {};
      let colouredTriangleVertices = new Array<number>();

      // Render tiles
      for (let x = minTileX; x < maxTileX; x++) {
         for (let y = minTileY; y < maxTileY; y++) {
            // Get the tile data
            const tile = this.getTile(x, y);
            const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type]; 
            
            // Add the vertices to its appropriate section
            if (tileTypeInfo.isLiquid) {
               const vertices = this.calculateLiquidTileVertices(x, y, tileTypeInfo.colour);

               // Add liquid vertices
               colouredTriangleVertices = colouredTriangleVertices.concat(vertices);
            } else {
               const vertices = this.calculateSolidTileVertices(x, y);
   
               if (texturedTriangleVertices.hasOwnProperty(tileTypeInfo.textureSource)) {
                  texturedTriangleVertices[tileTypeInfo.textureSource] = texturedTriangleVertices[tileTypeInfo.textureSource].concat(vertices);
               } else {
                  texturedTriangleVertices[tileTypeInfo.textureSource] = vertices;
               }
            }
         }
      }
      
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

   private static calculateSolidTileVertices(tileX: number, tileY: number): Array<number> {
      const x1 = tileX * SETTINGS.TILE_SIZE;
      const x2 = x1 + SETTINGS.TILE_SIZE;
      const y1 = tileY * SETTINGS.TILE_SIZE;
      const y2 = y1 + SETTINGS.TILE_SIZE;
      
      const canvasX1 = Camera.getXPositionInCanvas(x1, "game");
      const canvasX2 = Camera.getXPositionInCanvas(x2, "game");
      const canvasY1 = Camera.getYPositionInCanvas(y1, "game");
      const canvasY2 = Camera.getYPositionInCanvas(y2, "game");

      // Calculate vertices
      const triangleVertices =
      [
         canvasX1, canvasY1,    0, 0,
         canvasX2, canvasY1,    1, 0,
         canvasX1, canvasY2,    0, 1,
         canvasX1, canvasY2,    0, 1,
         canvasX2, canvasY1,    1, 0,
         canvasX2, canvasY2,    1, 1
      ];

      return triangleVertices;
   }

   private static calculateLiquidTileVertices(tileX: number, tileY: number, colour: [number, number, number]): Array<number> {
      const x1 = tileX * SETTINGS.TILE_SIZE;
      const x2 = x1 + SETTINGS.TILE_SIZE;
      const y1 = tileY * SETTINGS.TILE_SIZE;
      const y2 = y1 + SETTINGS.TILE_SIZE;
      
      const canvasX1 = Camera.getXPositionInCanvas(x1, "game");
      const canvasX2 = Camera.getXPositionInCanvas(x2, "game");
      const canvasY1 = Camera.getYPositionInCanvas(y1, "game");
      const canvasY2 = Camera.getYPositionInCanvas(y2, "game");

      // Calculate vertices
      const triangleVertices =
      [
         canvasX1, canvasY1,    colour[0], colour[1], colour[2],
         canvasX2, canvasY1,    colour[0], colour[1], colour[2],
         canvasX1, canvasY2,    colour[0], colour[1], colour[2],
         canvasX1, canvasY2,    colour[0], colour[1], colour[2],
         canvasX2, canvasY1,    colour[0], colour[1], colour[2],
         canvasX2, canvasY2,    colour[0], colour[1], colour[2]
      ];

      return triangleVertices;
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