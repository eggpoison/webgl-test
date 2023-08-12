import { SETTINGS, Vector } from "webgl-test-shared";
import { createWebGLProgram, gl } from "../../webgl";
import Game from "../../Game";
import { getTexture } from "../../textures";
import Camera from "../../Camera";
import { Tile } from "../../Tile";
import Player from "../../entities/Player";
// const SHALLOW_WATER_COLOUR = [95/255, 151/255, 196/255] as const;
const SHALLOW_WATER_COLOUR = [118/255, 185/255, 242/255] as const;
// const DEEP_WATER_COLOUR = [87/255, 87/255, 140/255] as const;
const DEEP_WATER_COLOUR = [86/255, 141/255, 184/255] as const;

const NEIGHBOURING_TILE_OFFSETS = [
   [0, 0],
   [-1, 0],
   [0, -1],
   [-1, -1]
];

// Base shaders

const baseVertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_coord;
attribute float a_topLeftLandDistance;
attribute float a_topRightLandDistance;
attribute float a_bottomLeftLandDistance;
attribute float a_bottomRightLandDistance;

varying vec2 v_coord;
varying float v_topLeftLandDistance;
varying float v_topRightLandDistance;
varying float v_bottomLeftLandDistance;
varying float v_bottomRightLandDistance;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_coord = a_coord;
   v_topLeftLandDistance = a_topLeftLandDistance;
   v_topRightLandDistance = a_topRightLandDistance;
   v_bottomLeftLandDistance = a_bottomLeftLandDistance;
   v_bottomRightLandDistance = a_bottomRightLandDistance;
}
`;

const baseFragmentShaderText = `
precision mediump float;

uniform sampler2D u_baseTexture;
uniform vec3 u_shallowWaterColour;
uniform vec3 u_deepWaterColour;
 
varying vec2 v_coord;
varying float v_topLeftLandDistance;
varying float v_topRightLandDistance;
varying float v_bottomLeftLandDistance;
varying float v_bottomRightLandDistance;

void main() {
   float a = mix(v_bottomLeftLandDistance, v_bottomRightLandDistance, v_coord.x);
   float b = mix(v_topLeftLandDistance, v_topRightLandDistance, v_coord.x);
   float dist = mix(a, b, v_coord.y);

   vec3 colour = mix(u_shallowWaterColour, u_deepWaterColour, dist);
   vec4 colourWithAlpha = vec4(colour, 1.0);

   vec4 textureColour = texture2D(u_baseTexture, v_coord);

   gl_FragColor = colourWithAlpha * textureColour;
}
`;

// Noise shaders

const noiseVertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute vec2 a_noiseOffset;

varying vec2 v_texCoord;
varying vec2 v_noiseOffset;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_noiseOffset = a_noiseOffset;
}
`;

const noiseFragmentShaderText = `
precision mediump float;
 
uniform sampler2D u_noiseTexture;
 
varying vec2 v_texCoord;
varying vec2 v_noiseOffset;
 
void main() {
   vec2 noiseCoord = fract(v_texCoord - v_noiseOffset);
   vec4 noiseColour = texture2D(u_noiseTexture, noiseCoord);

   noiseColour.r += 0.5;
   noiseColour.g += 0.5;
   noiseColour.b += 0.5;

   float distanceFromCenter = max(abs(v_texCoord.x - 0.5), abs(v_texCoord.y - 0.5));
   if (distanceFromCenter >= 0.166) {
      noiseColour.a *= mix(1.0, 0.0, (distanceFromCenter - 0.166) * 3.0);
   }

   gl_FragColor = noiseColour;
}
`;

let baseProgram: WebGLProgram;
let noiseProgram: WebGLProgram;

let baseTextureUniformLocation: WebGLUniformLocation;
let shallowWaterColourUniformLocation: WebGLUniformLocation;
let deepWaterColourUniformLocation: WebGLUniformLocation;

let noiseTextureUniformLocation: WebGLUniformLocation;

let baseProgramPositionAttribLocation: GLint;
let baseProgramCoordAttribLocation: GLint;
let topLeftLandDistanceAttribLocation: GLint;
let topRightLandDistanceAttribLocation: GLint;
let bottomLeftLandDistanceAttribLocation: GLint;
let bottomRightLandDistanceAttribLocation: GLint;

let noiseProgramPositionAttribLocation: GLint;
let noiseProgramTexCoordAttribLocation: GLint;
let noiseOffsetAttribLocation: GLint;

export function createWaterShaders(): void {
   // 
   // Base program
   // 

   baseProgram = createWebGLProgram(baseVertexShaderText, baseFragmentShaderText);

   baseTextureUniformLocation = gl.getUniformLocation(baseProgram, "u_baseTexture")!;
   shallowWaterColourUniformLocation = gl.getUniformLocation(baseProgram, "u_shallowWaterColour")!;
   deepWaterColourUniformLocation = gl.getUniformLocation(baseProgram, "u_deepWaterColour")!;

   baseProgramPositionAttribLocation = gl.getAttribLocation(baseProgram, "a_position");
   baseProgramCoordAttribLocation = gl.getAttribLocation(baseProgram, "a_coord");
   topLeftLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_topLeftLandDistance");
   topRightLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_topRightLandDistance");
   bottomLeftLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_bottomLeftLandDistance");
   bottomRightLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_bottomRightLandDistance");
   
   // 
   // Noise program
   // 

   noiseProgram = createWebGLProgram(noiseVertexShaderText, noiseFragmentShaderText);

   noiseTextureUniformLocation = gl.getUniformLocation(noiseProgram, "u_noiseTexture")!;

   noiseProgramPositionAttribLocation = gl.getAttribLocation(noiseProgram, "a_position");
   noiseProgramTexCoordAttribLocation = gl.getAttribLocation(noiseProgram, "a_texCoord");
   noiseOffsetAttribLocation = gl.getAttribLocation(noiseProgram, "a_noiseOffset");
}

const calculateVisibleWaterTiles = (): ReadonlyArray<Tile> => {
   const visibleChunkBounds = Camera.getVisibleChunkBounds();

   const minTileX = visibleChunkBounds[0] * SETTINGS.CHUNK_SIZE;
   const maxTileX = (visibleChunkBounds[1] + 1) * SETTINGS.CHUNK_SIZE - 1;
   const minTileY = visibleChunkBounds[2] * SETTINGS.CHUNK_SIZE;
   const maxTileY = (visibleChunkBounds[3] + 1) * SETTINGS.CHUNK_SIZE - 1;

   const tiles = new Array<Tile>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Game.board.getTile(tileX, tileY);
         if (tile.type === "water") {
            tiles.push(tile);
         }         
      }
   }
   return tiles;
}

const calculateDistanceToLand = (tileX: number, tileY: number): number => {
   // Check if any neighbouring tiles are land tiles
   for (const offset of NEIGHBOURING_TILE_OFFSETS) {
      const x = tileX + offset[0];
      const y = tileY + offset[1];
      if (!Game.board.tileIsInBoard(x, y)) {
         continue;
      }

      const tile = Game.board.getTile(x, y);
      if (tile.type !== "water") {
         return 0;
      }
   }

   return 1;
}

const calculateBaseVertices = (tiles: ReadonlyArray<Tile>): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   for (const tile of tiles) {
      let x1 = tile.x * SETTINGS.TILE_SIZE;
      let x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
      let y1 = tile.y * SETTINGS.TILE_SIZE;
      let y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

      x1 = Camera.calculateXCanvasPosition(x1);
      x2 = Camera.calculateXCanvasPosition(x2);
      y1 = Camera.calculateYCanvasPosition(y1);
      y2 = Camera.calculateYCanvasPosition(y2);

      const bottomLeftLandDistance = calculateDistanceToLand(tile.x, tile.y);
      const bottomRightLandDistance = calculateDistanceToLand(tile.x + 1, tile.y);
      const topLeftLandDistance = calculateDistanceToLand(tile.x, tile.y + 1);
      const topRightLandDistance = calculateDistanceToLand(tile.x + 1, tile.y + 1);

      vertices.push(
         x1, y1, 0, 0, bottomLeftLandDistance, bottomRightLandDistance, topLeftLandDistance, topRightLandDistance,
         x2, y1, 1, 0, bottomLeftLandDistance, bottomRightLandDistance, topLeftLandDistance, topRightLandDistance,
         x1, y2, 0, 1, bottomLeftLandDistance, bottomRightLandDistance, topLeftLandDistance, topRightLandDistance,
         x1, y2, 0, 1, bottomLeftLandDistance, bottomRightLandDistance, topLeftLandDistance, topRightLandDistance,
         x2, y1, 1, 0, bottomLeftLandDistance, bottomRightLandDistance, topLeftLandDistance, topRightLandDistance,
         x2, y2, 1, 1, bottomLeftLandDistance, bottomRightLandDistance, topLeftLandDistance, topRightLandDistance
      );
   }

   return vertices;
}

const calculateNoiseVertices = (tiles: ReadonlyArray<Tile>): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   for (const tile of tiles) {
      let x1 = (tile.x - 0.5) * SETTINGS.TILE_SIZE;
      let x2 = (tile.x + 1.5) * SETTINGS.TILE_SIZE;
      let y1 = (tile.y - 0.5) * SETTINGS.TILE_SIZE;
      let y2 = (tile.y + 1.5) * SETTINGS.TILE_SIZE;

      x1 = Camera.calculateXCanvasPosition(x1);
      x2 = Camera.calculateXCanvasPosition(x2);
      y1 = Camera.calculateYCanvasPosition(y1);
      y2 = Camera.calculateYCanvasPosition(y2);

      const epsilon = 0.01;
      const isDiagonal = Math.abs(tile.flowDirection!) > epsilon && Math.abs(tile.flowDirection! - Math.PI/2) > epsilon && Math.abs(tile.flowDirection! - Math.PI) > epsilon && Math.abs(tile.flowDirection! + Math.PI/2) > epsilon;

      const speed = 0.3;
      let offsetMagnitude: number;
      if (isDiagonal) {
         offsetMagnitude = (Game.lastTime * speed / 1000 / Math.SQRT2) % 1;
      } else {
         offsetMagnitude = (Game.lastTime * speed / 1000) % 1;
      }
      let offsetVector: Vector;
      if (isDiagonal) {
         offsetVector = new Vector(offsetMagnitude * Math.SQRT2, tile.flowDirection!);
      } else {
         offsetVector = new Vector(offsetMagnitude, tile.flowDirection!);
      }
      const offset = offsetVector.convertToPoint();

      vertices.push(
         x1, y1, 0, 0, offset.x, offset.y,
         x2, y1, 1, 0, offset.x, offset.y,
         x1, y2, 0, 1, offset.x, offset.y,
         x1, y2, 0, 1, offset.x, offset.y,
         x2, y1, 1, 0, offset.x, offset.y,
         x2, y2, 1, 1, offset.x, offset.y
      );
   }

   return vertices;
}

export function renderLiquidTiles(): void {
   const visibleTiles = calculateVisibleWaterTiles();

   const baseVertices = calculateBaseVertices(visibleTiles);
   const noiseVertices = calculateNoiseVertices(visibleTiles);
   
   // 
   // Base program
   // 
   
   gl.useProgram(baseProgram);

   {
      // Create tile buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(baseVertices), gl.STATIC_DRAW);
   
      gl.vertexAttribPointer(baseProgramPositionAttribLocation, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(baseProgramCoordAttribLocation, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(bottomLeftLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(bottomRightLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(topLeftLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(topRightLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
      
      // Enable the attributes
      gl.enableVertexAttribArray(baseProgramPositionAttribLocation);
      gl.enableVertexAttribArray(baseProgramCoordAttribLocation);
      gl.enableVertexAttribArray(bottomLeftLandDistanceAttribLocation);
      gl.enableVertexAttribArray(bottomRightLandDistanceAttribLocation);
      gl.enableVertexAttribArray(topLeftLandDistanceAttribLocation);
      gl.enableVertexAttribArray(topRightLandDistanceAttribLocation);
      
      gl.uniform1i(baseTextureUniformLocation, 0);
      gl.uniform3f(shallowWaterColourUniformLocation, ...SHALLOW_WATER_COLOUR);
      gl.uniform3f(deepWaterColourUniformLocation, ...DEEP_WATER_COLOUR);

      const texture = getTexture("tiles/water-base.png");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, baseVertices.length / 8);
   }
   
   // 
   // Noise program
   // 
   
   gl.useProgram(noiseProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   {
      // Create tile buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(noiseVertices), gl.STATIC_DRAW);
   
      gl.vertexAttribPointer(noiseProgramPositionAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(noiseProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(noiseOffsetAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   
      // Enable the attributes
      gl.enableVertexAttribArray(noiseProgramPositionAttribLocation);
      gl.enableVertexAttribArray(noiseProgramTexCoordAttribLocation);
      gl.enableVertexAttribArray(noiseOffsetAttribLocation);
      
      gl.uniform1i(noiseTextureUniformLocation, 0);
               
      // Set noise texture
      const noiseTexture = getTexture("tiles/water-noise.png");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
   
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, noiseVertices.length / 6);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}