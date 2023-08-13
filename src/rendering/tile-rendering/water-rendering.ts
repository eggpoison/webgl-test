import { Point, RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneSize, SETTINGS, TileType, Vector, WaterRockSize, lerp, rotatePoint } from "webgl-test-shared";
import { createWebGLProgram, gl } from "../../webgl";
import Game from "../../Game";
import { getTexture } from "../../textures";
import Camera from "../../Camera";
import { Tile } from "../../Tile";

const SHALLOW_WATER_COLOUR = [118/255, 185/255, 242/255] as const;
const DEEP_WATER_COLOUR = [86/255, 141/255, 184/255] as const;

const WATER_VISUAL_FLOW_SPEED = 0.3;

const ADJACENT_TILE_OFFSETS = [
   [0, 0],
   [-1, 0],
   [0, -1],
   [-1, -1]
];

const NEIGHBOURING_TILE_OFFSETS = [
   [1, 0],
   [-1, 0],
   [0, -1],
   [-1, -1],
   [1, 1],
   [-1, 1],
   [0, 1],
   [1, -1]
];

const TRANSITION_TEXTURES: Record<TileType, string | null> = {
   "grass": "tiles/gravel.png",
   "dirt": "tiles/gravel.png",
   "rock": "tiles/gravel.png",
   "darkRock": null,
   "ice": "tiles/gravel.png",
   "lava": "tiles/gravel.png",
   "permafrost": "tiles/gravel.png",
   "sludge": "tiles/gravel.png",
   "sandstone": "tiles/gravel.png",
   "slime": "tiles/gravel.png",
   "magma": "tiles/gravel.png",
   "water": null, // Transitions can't occur between two water tiles
   "snow": "tiles/gravel.png",
   "sand": "tiles/gravel.png"
}

const WATER_ROCK_SIZES: Record<WaterRockSize, number> = {
   [WaterRockSize.small]: 24,
   [WaterRockSize.large]: 32
};

const WATER_ROCK_TEXTURES: Record<WaterRockSize, string> = {
   [WaterRockSize.small]: "tiles/water-rock-small.png",
   [WaterRockSize.large]: "tiles/water-rock-large.png"
};

const RIVER_STEPPING_STONE_TEXTURES: Record<RiverSteppingStoneSize, string> = {
   [RiverSteppingStoneSize.small]: "tiles/river-stepping-stone-small.png",
   [RiverSteppingStoneSize.medium]: "tiles/river-stepping-stone-medium.png",
   [RiverSteppingStoneSize.large]: "tiles/river-stepping-stone-large.png"
};

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

// Rock shaders

const rockVertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute float a_opacity;

varying vec2 v_texCoord;
varying float v_opacity;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_opacity = a_opacity;
}
`;

const rockFragmentShaderText = `
precision mediump float;
 
uniform sampler2D u_texture;
 
varying vec2 v_texCoord;
varying float v_opacity;
 
void main() {
   vec4 textureColour = texture2D(u_texture, v_texCoord);
   textureColour.a *= v_opacity;
   gl_FragColor = textureColour;
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

// Transition shaders

const transitionVertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute float a_topLeftMarker;
attribute float a_topRightMarker;
attribute float a_bottomLeftMarker;
attribute float a_bottomRightMarker;
attribute float a_topMarker;
attribute float a_rightMarker;
attribute float a_leftMarker;
attribute float a_bottomMarker;

varying vec2 v_texCoord;
varying float v_topLeftMarker;
varying float v_topRightMarker;
varying float v_bottomLeftMarker;
varying float v_bottomRightMarker;
varying float v_topMarker;
varying float v_rightMarker;
varying float v_leftMarker;
varying float v_bottomMarker;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_topLeftMarker = a_topLeftMarker;
   v_topRightMarker = a_topRightMarker;
   v_bottomLeftMarker = a_bottomLeftMarker;
   v_bottomRightMarker = a_bottomRightMarker;
   v_topMarker = a_topMarker;
   v_rightMarker = a_rightMarker;
   v_leftMarker = a_leftMarker;
   v_bottomMarker = a_bottomMarker;
}
`;

const transitionFragmentShaderText = `
precision mediump float;

uniform sampler2D u_transitionTexture;
 
varying vec2 v_texCoord;
varying float v_topLeftMarker;
varying float v_topRightMarker;
varying float v_bottomLeftMarker;
varying float v_bottomRightMarker;
varying float v_topMarker;
varying float v_rightMarker;
varying float v_leftMarker;
varying float v_bottomMarker;

void main() {
   float topLeftDist = 1.0 - (distance(vec2(0.0, 1.0), v_texCoord) * (1.0 - v_topLeftMarker));
   float topRightDist = 1.0 - (distance(vec2(1.0, 1.0), v_texCoord) * (1.0 - v_topRightMarker));
   float bottomLeftDist = 1.0 - (distance(vec2(0.0, 0.0), v_texCoord) * (1.0 - v_bottomLeftMarker));
   float bottomRightDist = 1.0 - (distance(vec2(1.0, 0.0), v_texCoord) * (1.0 - v_bottomRightMarker));

   float dist = 0.0;
   if (v_topLeftMarker < 0.5) {
      dist = max(dist, topLeftDist - 0.5);
   }
   if (v_topRightMarker < 0.5) {
      dist = max(dist, topRightDist - 0.5);
   }
   if (v_bottomLeftMarker < 0.5) {
      dist = max(dist, bottomLeftDist - 0.5);
   }
   if (v_bottomRightMarker < 0.5) {
      dist = max(dist, bottomRightDist - 0.5);
   }

   float topDist = v_texCoord.y * (1.0 - v_topMarker);
   float rightDist = (1.0 - v_texCoord.x) * (1.0 - v_rightMarker);
   float leftDist = v_texCoord.x * (1.0 - v_leftMarker);
   float bottomDist = (1.0 - v_texCoord.y) * (1.0 - v_bottomMarker);
   if (v_topMarker < 0.5) {
      dist = max(dist, topDist - 0.5);
   }
   if (v_rightMarker < 0.5) {
      dist = max(dist, rightDist - 0.5);
   }
   if (v_leftMarker < 0.5) {
      dist = max(dist, leftDist - 0.5);
   }
   if (v_bottomMarker < 0.5) {
      dist = max(dist, bottomDist - 0.5);
   }

   dist = pow(dist, 0.3);
   
   vec4 textureColour = texture2D(u_transitionTexture, v_texCoord);
   textureColour.a *= dist;
   
   gl_FragColor = textureColour;
}
`;

// Stepping stone shaders

const steppingStoneVertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
}
`;

const steppingStoneFragmentShaderText = `
precision mediump float;
 
uniform sampler2D u_texture;
 
varying vec2 v_texCoord;
 
void main() {
   gl_FragColor = texture2D(u_texture, v_texCoord);
}
`;

let baseProgram: WebGLProgram;
let rockProgram: WebGLProgram;
let noiseProgram: WebGLProgram;
let transitionProgram: WebGLProgram;
let steppingStoneProgram: WebGLProgram;

let baseTextureUniformLocation: WebGLUniformLocation;
let shallowWaterColourUniformLocation: WebGLUniformLocation;
let deepWaterColourUniformLocation: WebGLUniformLocation;

let rockProgramTextureUniformLocation: WebGLUniformLocation;

let noiseTextureUniformLocation: WebGLUniformLocation;

let transitionTextureUniformLocation: WebGLUniformLocation;

let steppingStoneTextureUniformLocation: WebGLUniformLocation;

let baseProgramPositionAttribLocation: GLint;
let baseProgramCoordAttribLocation: GLint;
let baseProgramTopLeftLandDistanceAttribLocation: GLint;
let baseProgramTopRightLandDistanceAttribLocation: GLint;
let baseProgramBottomLeftLandDistanceAttribLocation: GLint;
let baseProgramBottomRightLandDistanceAttribLocation: GLint;

let rockProgramPositionAttribLocation: GLint;
let rockProgramCoordAttribLocation: GLint;
let rockProgramOpacityAttribLocation: GLint;

let noiseProgramPositionAttribLocation: GLint;
let noiseProgramTexCoordAttribLocation: GLint;
let noiseOffsetAttribLocation: GLint;

let transitionProgramPositionAttribLocation: GLint;
let transitionProgramTexCoordAttribLocation: GLint;
let transitionProgramTopLeftMarkerAttribLocation: GLint;
let transitionProgramTopRightMarkerAttribLocation: GLint;
let transitionProgramBottomLeftMarkerAttribLocation: GLint;
let transitionProgramBottomRightMarkerAttribLocation: GLint;
let transitionProgramTopMarkerAttribLocation: GLint;
let transitionProgramRightMarkerAttribLocation: GLint;
let transitionProgramLeftMarkerAttribLocation: GLint;
let transitionProgramBottomMarkerAttribLocation: GLint;

let steppingStoneProgramPositionAttribLocation: GLint;
let steppingStoneProgramTexCoordAttribLocation: GLint;

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
   baseProgramTopLeftLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_topLeftLandDistance");
   baseProgramTopRightLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_topRightLandDistance");
   baseProgramBottomLeftLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_bottomLeftLandDistance");
   baseProgramBottomRightLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_bottomRightLandDistance");
   
   // 
   // Rock program
   // 

   rockProgram = createWebGLProgram(rockVertexShaderText, rockFragmentShaderText);

   rockProgramTextureUniformLocation = gl.getUniformLocation(rockProgram, "u_texture")!;

   rockProgramPositionAttribLocation = gl.getAttribLocation(rockProgram, "a_position");
   rockProgramCoordAttribLocation = gl.getAttribLocation(rockProgram, "a_texCoord");
   rockProgramOpacityAttribLocation = gl.getAttribLocation(rockProgram, "a_opacity");
   
   // 
   // Noise program
   // 

   noiseProgram = createWebGLProgram(noiseVertexShaderText, noiseFragmentShaderText);

   noiseTextureUniformLocation = gl.getUniformLocation(noiseProgram, "u_noiseTexture")!;

   noiseProgramPositionAttribLocation = gl.getAttribLocation(noiseProgram, "a_position");
   noiseProgramTexCoordAttribLocation = gl.getAttribLocation(noiseProgram, "a_texCoord");
   noiseOffsetAttribLocation = gl.getAttribLocation(noiseProgram, "a_noiseOffset");

   // 
   // Transition program
   // 

   transitionProgram = createWebGLProgram(transitionVertexShaderText, transitionFragmentShaderText);

   transitionTextureUniformLocation = gl.getUniformLocation(transitionProgram, "u_transitionTexture")!;

   transitionProgramPositionAttribLocation = gl.getAttribLocation(transitionProgram, "a_position");
   transitionProgramTexCoordAttribLocation = gl.getAttribLocation(transitionProgram, "a_texCoord");
   transitionProgramTopLeftMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_topLeftMarker");
   transitionProgramTopRightMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_topRightMarker");
   transitionProgramBottomLeftMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_bottomLeftMarker");
   transitionProgramBottomRightMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_bottomRightMarker");
   transitionProgramTopMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_topMarker");
   transitionProgramRightMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_rightMarker");
   transitionProgramLeftMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_leftMarker");
   transitionProgramBottomMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_bottomMarker");
   
   // 
   // Stepping stone program
   // 

   steppingStoneProgram = createWebGLProgram(steppingStoneVertexShaderText, steppingStoneFragmentShaderText);

   steppingStoneTextureUniformLocation = gl.getUniformLocation(steppingStoneProgram, "u_texture")!;

   steppingStoneProgramPositionAttribLocation = gl.getAttribLocation(steppingStoneProgram, "a_position");
   steppingStoneProgramTexCoordAttribLocation = gl.getAttribLocation(steppingStoneProgram, "a_texCoord");
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
   for (const offset of ADJACENT_TILE_OFFSETS) {
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

const calculateDistanceToWater = (tileX: number, tileY: number): number => {
   // Check if any neighbouring tiles are water tiles
   for (const offset of ADJACENT_TILE_OFFSETS) {
      const x = tileX + offset[0];
      const y = tileY + offset[1];
      if (!Game.board.tileIsInBoard(x, y)) {
         continue;
      }

      const tile = Game.board.getTile(x, y);
      if (tile.type === "water") {
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

      let offsetVector: Vector;
      if (isDiagonal) {
         const offsetMagnitude = (Game.lastTime * WATER_VISUAL_FLOW_SPEED / 1000 / Math.SQRT2 + tile.flowOffset) % 1;
         offsetVector = new Vector(offsetMagnitude * Math.SQRT2, tile.flowDirection!);
      } else {
         const offsetMagnitude = (Game.lastTime * WATER_VISUAL_FLOW_SPEED / 1000 + tile.flowOffset) % 1;
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

const waterEdgeDist = (tileX: number, tileY: number): number => {
   if (!Game.board.tileIsInBoard(tileX, tileY)) {
      return 1;
   }

   const tile = Game.board.getTile(tileX, tileY);
   if (tile.type === "water") {
      return 0;
   }
   return 1;
}

const calculateTransitionVertices = (visibleTiles: ReadonlyArray<Tile>): Record<string, ReadonlyArray<number>> => {
   const edgeTileIndexes = new Set<number>();

   for (const tile of visibleTiles) {
      for (const offset of NEIGHBOURING_TILE_OFFSETS) {
         const tileX = tile.x + offset[0];
         const tileY = tile.y + offset[1];
         if (Game.board.tileIsInBoard(tileX, tileY)) {
            const tile = Game.board.getTile(tileX, tileY);
            if (tile.type !== "water") {
               const tileIndex = tileY * SETTINGS.BOARD_DIMENSIONS + tileX;
               edgeTileIndexes.add(tileIndex);
            }
         }
      }
   }

   const vertexRecord: Record<string, Array<number>> = {};
   
   for (const tileIndex of edgeTileIndexes) {
      const tileX = tileIndex % SETTINGS.BOARD_DIMENSIONS;
      const tileY = Math.floor(tileIndex / SETTINGS.BOARD_DIMENSIONS);

      const tile = Game.board.getTile(tileX, tileY);

      const transitionTextureSource = TRANSITION_TEXTURES[tile.type];
      if (transitionTextureSource === null) {
         continue;
      }
      if (!vertexRecord.hasOwnProperty(transitionTextureSource)) {
         vertexRecord[transitionTextureSource] = [];
      }

      let x1 = tile.x * SETTINGS.TILE_SIZE;
      let x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
      let y1 = tile.y * SETTINGS.TILE_SIZE;
      let y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

      x1 = Camera.calculateXCanvasPosition(x1);
      x2 = Camera.calculateXCanvasPosition(x2);
      y1 = Camera.calculateYCanvasPosition(y1);
      y2 = Camera.calculateYCanvasPosition(y2);

      const bottomLeftWaterDistance = calculateDistanceToWater(tile.x, tile.y);
      const bottomRightWaterDistance = calculateDistanceToWater(tile.x + 1, tile.y);
      const topLeftWaterDistance = calculateDistanceToWater(tile.x, tile.y + 1);
      const topRightWaterDistance = calculateDistanceToWater(tile.x + 1, tile.y + 1);

      const topMarker = waterEdgeDist(tile.x, tile.y + 1);
      const rightMarker = waterEdgeDist(tile.x - 1, tile.y);
      const leftMarker = waterEdgeDist(tile.x + 1, tile.y);
      const bottomMarker = waterEdgeDist(tile.x, tile.y - 1);
      
      vertexRecord[transitionTextureSource].push(
         x1, y1, 0, 0, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x2, y1, 1, 0, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x1, y2, 0, 1, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x1, y2, 0, 1, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x2, y1, 1, 0, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x2, y2, 1, 1, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker
      );
   }

   return vertexRecord;
}

const calculateRockVertices = (): Record<string, ReadonlyArray<number>> => {
   const vertexRecord: Record<string, Array<number>> = {};

   const visibleChunkBounds = Camera.getVisibleChunkBounds();
   
   for (let chunkX = visibleChunkBounds[0]; chunkX <= visibleChunkBounds[1]; chunkX++) {
      for (let chunkY = visibleChunkBounds[2]; chunkY <= visibleChunkBounds[3]; chunkY++) {
         const chunk = Game.board.getChunk(chunkX, chunkY);
         for (const waterRock of chunk.waterRocks) {
            const size = WATER_ROCK_SIZES[waterRock.size];
            
            let x1 = (waterRock.position[0] - size/2);
            let x2 = (waterRock.position[0] + size/2);
            let y1 = (waterRock.position[1] - size/2);
            let y2 = (waterRock.position[1] + size/2);
   
            let topLeft = new Point(x1, y2);
            let topRight = new Point(x2, y2);
            let bottomRight = new Point(x2, y1);
            let bottomLeft = new Point(x1, y1);

            const pos = new Point(waterRock.position[0], waterRock.position[1]);

            // Rotate the points to match the entity's rotation
            topLeft = rotatePoint(topLeft, pos, waterRock.rotation);
            topRight = rotatePoint(topRight, pos, waterRock.rotation);
            bottomRight = rotatePoint(bottomRight, pos, waterRock.rotation);
            bottomLeft = rotatePoint(bottomLeft, pos, waterRock.rotation);

            topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
            topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
            bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));
            bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));

            const opacity = lerp(0.15, 0.4, waterRock.opacity);

            const textureSource = WATER_ROCK_TEXTURES[waterRock.size];
            if (!vertexRecord.hasOwnProperty(textureSource)) {
               vertexRecord[textureSource] = [];
            }

            vertexRecord[textureSource].push(
               bottomLeft.x, bottomLeft.y, 0, 0, opacity,
               bottomRight.x, bottomRight.y, 1, 0, opacity,
               topLeft.x, topLeft.y, 0, 1, opacity,
               topLeft.x, topLeft.y, 0, 1, opacity,
               bottomRight.x, bottomRight.y, 1, 0, opacity,
               topRight.x, topRight.y, 1, 1, opacity
            );
         }
      }
   }

   return vertexRecord;
}

const calculateSteppingStoneVertices = (): Record<string, ReadonlyArray<number>> => {
   const vertexRecord: Record<string, Array<number>> = {};

   const visibleChunkBounds = Camera.getVisibleChunkBounds();
   
   for (let chunkX = visibleChunkBounds[0]; chunkX <= visibleChunkBounds[1]; chunkX++) {
      for (let chunkY = visibleChunkBounds[2]; chunkY <= visibleChunkBounds[3]; chunkY++) {
         const chunk = Game.board.getChunk(chunkX, chunkY);
         for (const riverSteppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[riverSteppingStone.size];
            
            let x1 = (riverSteppingStone.position[0] - size/2);
            let x2 = (riverSteppingStone.position[0] + size/2);
            let y1 = (riverSteppingStone.position[1] - size/2);
            let y2 = (riverSteppingStone.position[1] + size/2);
   
            let topLeft = new Point(x1, y2);
            let topRight = new Point(x2, y2);
            let bottomRight = new Point(x2, y1);
            let bottomLeft = new Point(x1, y1);

            const pos = new Point(riverSteppingStone.position[0], riverSteppingStone.position[1]);

            // Rotate the points to match the entity's rotation
            topLeft = rotatePoint(topLeft, pos, riverSteppingStone.rotation);
            topRight = rotatePoint(topRight, pos, riverSteppingStone.rotation);
            bottomRight = rotatePoint(bottomRight, pos, riverSteppingStone.rotation);
            bottomLeft = rotatePoint(bottomLeft, pos, riverSteppingStone.rotation);

            topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
            topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
            bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));
            bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));

            const textureSource = RIVER_STEPPING_STONE_TEXTURES[riverSteppingStone.size];
            if (!vertexRecord.hasOwnProperty(textureSource)) {
               vertexRecord[textureSource] = [];
            }

            vertexRecord[textureSource].push(
               bottomLeft.x, bottomLeft.y, 0, 0,
               bottomRight.x, bottomRight.y, 1, 0,
               topLeft.x, topLeft.y, 0, 1,
               topLeft.x, topLeft.y, 0, 1,
               bottomRight.x, bottomRight.y, 1, 0,
               topRight.x, topRight.y, 1, 1
            );
         }
      }
   }

   return vertexRecord;
}

export function renderLiquidTiles(): void {
   const visibleTiles = calculateVisibleWaterTiles();

   const baseVertices = calculateBaseVertices(visibleTiles);
   const rockVertexRecord = calculateRockVertices();
   const noiseVertices = calculateNoiseVertices(visibleTiles);
   const transitionVertexRecord = calculateTransitionVertices(visibleTiles);
   const steppingStoneVertices = calculateSteppingStoneVertices();
   
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
      gl.vertexAttribPointer(baseProgramBottomLeftLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(baseProgramBottomRightLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(baseProgramTopLeftLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(baseProgramTopRightLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
      
      // Enable the attributes
      gl.enableVertexAttribArray(baseProgramPositionAttribLocation);
      gl.enableVertexAttribArray(baseProgramCoordAttribLocation);
      gl.enableVertexAttribArray(baseProgramBottomLeftLandDistanceAttribLocation);
      gl.enableVertexAttribArray(baseProgramBottomRightLandDistanceAttribLocation);
      gl.enableVertexAttribArray(baseProgramTopLeftLandDistanceAttribLocation);
      gl.enableVertexAttribArray(baseProgramTopRightLandDistanceAttribLocation);
      
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
   // Rock program
   // 

   gl.useProgram(rockProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   for (const [textureSource, vertices] of Object.entries(rockVertexRecord)) {
      // Create tile buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
      gl.vertexAttribPointer(rockProgramPositionAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(rockProgramCoordAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(rockProgramOpacityAttribLocation, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      
      // Enable the attributes
      gl.enableVertexAttribArray(rockProgramPositionAttribLocation);
      gl.enableVertexAttribArray(rockProgramCoordAttribLocation);
      gl.enableVertexAttribArray(rockProgramOpacityAttribLocation);
      
      gl.uniform1i(rockProgramTextureUniformLocation, 0);

      const texture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);
   }
   
   // 
   // Noise program
   // 
   
   gl.useProgram(noiseProgram);

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

   // 
   // Transition program
   // 

   gl.useProgram(transitionProgram);

   for (const [textureSource, vertices] of Object.entries(transitionVertexRecord)) {
      // Create tile buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
      gl.vertexAttribPointer(transitionProgramPositionAttribLocation, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(transitionProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(transitionProgramBottomLeftMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(transitionProgramBottomRightMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(transitionProgramTopLeftMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(transitionProgramTopRightMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(transitionProgramTopMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(transitionProgramRightMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 9 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(transitionProgramLeftMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 10 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(transitionProgramBottomMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
   
      // Enable the attributes
      gl.enableVertexAttribArray(noiseProgramPositionAttribLocation);
      gl.enableVertexAttribArray(noiseProgramTexCoordAttribLocation);
      gl.enableVertexAttribArray(transitionProgramBottomLeftMarkerAttribLocation);
      gl.enableVertexAttribArray(transitionProgramBottomRightMarkerAttribLocation);
      gl.enableVertexAttribArray(transitionProgramTopLeftMarkerAttribLocation);
      gl.enableVertexAttribArray(transitionProgramTopRightMarkerAttribLocation);
      gl.enableVertexAttribArray(transitionProgramTopMarkerAttribLocation);
      gl.enableVertexAttribArray(transitionProgramRightMarkerAttribLocation);
      gl.enableVertexAttribArray(transitionProgramLeftMarkerAttribLocation);
      gl.enableVertexAttribArray(transitionProgramBottomMarkerAttribLocation);
      
      gl.uniform1i(transitionTextureUniformLocation, 0);
      
      // Set transition texture
      const transitionTexture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, transitionTexture);
   
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 12);
   }
   
   // 
   // Stepping stone program
   // 

   gl.useProgram(steppingStoneProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   for (const [textureSource, vertices] of Object.entries(steppingStoneVertices)) {
      // Create tile buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
      gl.vertexAttribPointer(steppingStoneProgramPositionAttribLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(steppingStoneProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      
      // Enable the attributes
      gl.enableVertexAttribArray(steppingStoneProgramPositionAttribLocation);
      gl.enableVertexAttribArray(steppingStoneProgramTexCoordAttribLocation);
      
      gl.uniform1i(steppingStoneTextureUniformLocation, 0);

      const texture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}