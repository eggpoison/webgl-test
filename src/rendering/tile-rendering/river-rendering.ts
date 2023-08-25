import { Point, RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneSize, SETTINGS, Vector, WaterRockSize, lerp, rotatePoint } from "webgl-test-shared";
import { createWebGLProgram, gl, halfWindowHeight, halfWindowWidth } from "../../webgl";
import Game from "../../Game";
import { getTexture } from "../../textures";
import Camera from "../../Camera";
import { Tile } from "../../Tile";
import { RiverSteppingStone } from "../../Board";
import { RENDER_CHUNK_SIZE, RenderChunkRiverInfo, getRenderChunkRiverInfo } from "./render-chunks";

const SHALLOW_WATER_COLOUR = [118/255, 185/255, 242/255] as const;
const DEEP_WATER_COLOUR = [86/255, 141/255, 184/255] as const;

const WATER_VISUAL_FLOW_SPEED = 0.3;

/** How much the stepping stone foam should be offset from their stepping stones */
const FOAM_OFFSET = 3;
/** Extra size given to the foam under stepping stones */
const FOAM_PADDING = 3.5;

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

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

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
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

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

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute float a_opacity;

varying vec2 v_texCoord;
varying float v_opacity;
 
void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

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

// Highlight shaders

const highlightsVertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute float a_fadeProgress;

varying vec2 v_texCoord;
varying float v_fadeProgress;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_fadeProgress = a_fadeProgress;
}
`;

const highlightsFragmentShaderText = `
precision mediump float;
 
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;
 
varying vec2 v_texCoord;
varying float v_fadeProgress;
 
void main() {
   vec4 outputColour;
   if (v_fadeProgress < 1.0) {
      vec4 texture1Colour = texture2D(u_texture1, v_texCoord);
      vec4 texture2Colour = texture2D(u_texture2, v_texCoord);
      outputColour = mix(texture1Colour, texture2Colour, v_fadeProgress);
   } else if (v_fadeProgress < 2.0) {
      vec4 texture2Colour = texture2D(u_texture2, v_texCoord);
      vec4 texture3Colour = texture2D(u_texture3, v_texCoord);
      outputColour = mix(texture2Colour, texture3Colour, v_fadeProgress - 1.0);
   } else {
      vec4 texture3Colour = texture2D(u_texture3, v_texCoord);
      vec4 texture1Colour = texture2D(u_texture1, v_texCoord);
      outputColour = mix(texture3Colour, texture1Colour, v_fadeProgress - 2.0);
   }

   outputColour.a *= 0.4;

   gl_FragColor = outputColour;
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

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

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
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

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
   float dist = 0.0;
   if (v_topLeftMarker < 0.5) {
      float topLeftDist = 1.0 - (distance(vec2(0.0, 1.0), v_texCoord) * (1.0 - v_topLeftMarker));
      dist = max(dist, topLeftDist - 0.5);
   }
   if (v_topRightMarker < 0.5) {
      float topRightDist = 1.0 - (distance(vec2(1.0, 1.0), v_texCoord) * (1.0 - v_topRightMarker));
      dist = max(dist, topRightDist - 0.5);
   }
   if (v_bottomLeftMarker < 0.5) {
      float bottomLeftDist = 1.0 - (distance(vec2(0.0, 0.0), v_texCoord) * (1.0 - v_bottomLeftMarker));
      dist = max(dist, bottomLeftDist - 0.5);
   }
   if (v_bottomRightMarker < 0.5) {
      float bottomRightDist = 1.0 - (distance(vec2(1.0, 0.0), v_texCoord) * (1.0 - v_bottomRightMarker));
      dist = max(dist, bottomRightDist - 0.5);
   }

   if (v_topMarker < 0.5) {
      float topDist = v_texCoord.y * (1.0 - v_topMarker);
      dist = max(dist, topDist - 0.5);
   }
   if (v_rightMarker < 0.5) {
      float rightDist = (1.0 - v_texCoord.x) * (1.0 - v_rightMarker);
      dist = max(dist, rightDist - 0.5);
   }
   if (v_leftMarker < 0.5) {
      float leftDist = v_texCoord.x * (1.0 - v_leftMarker);
      dist = max(dist, leftDist - 0.5);
   }
   if (v_bottomMarker < 0.5) {
      float bottomDist = (1.0 - v_texCoord.y) * (1.0 - v_bottomMarker);
      dist = max(dist, bottomDist - 0.5);
   }

   dist = pow(dist, 0.3);
   
   vec4 textureColour = texture2D(u_transitionTexture, v_texCoord);
   textureColour.a = dist;
   
   gl_FragColor = textureColour;
}
`;

// Foam shaders

const foamVertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute vec2 a_textureOffset;

varying vec2 v_texCoord;
varying vec2 v_textureOffset;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_textureOffset = a_textureOffset;
}
`;

const foamFragmentShaderText = `
precision mediump float;
 
uniform sampler2D u_steppingStoneTexture;
uniform sampler2D u_foamTexture;
 
varying vec2 v_texCoord;
varying vec2 v_textureOffset;
 
void main() {
   vec4 steppingStoneColour = texture2D(u_steppingStoneTexture, v_texCoord);
   
   vec2 foamCoord = fract(v_texCoord - v_textureOffset);
   vec4 foam = texture2D(u_foamTexture, foamCoord);
   foam.a *= steppingStoneColour.a;

   float distFromCenter = distance(v_texCoord, vec2(0.5, 0.5));
   float multiplier = 1.0 - distFromCenter * 2.0;
   multiplier = pow(multiplier, 0.25);
   foam.a *= multiplier;

   gl_FragColor = foam;
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
let highlightsProgram: WebGLProgram;
let noiseProgram: WebGLProgram;
let transitionProgram: WebGLProgram;
let foamProgram: WebGLProgram;
let steppingStoneProgram: WebGLProgram;

let baseProgramPlayerPosUniformLocation: WebGLUniformLocation;
let baseProgramHalfWindowSizeUniformLocation: WebGLUniformLocation;
let baseProgramZoomUniformLocation: WebGLUniformLocation;
let baseTextureUniformLocation: WebGLUniformLocation;
let shallowWaterColourUniformLocation: WebGLUniformLocation;
let deepWaterColourUniformLocation: WebGLUniformLocation;

let rockProgramPlayerPosUniformLocation: WebGLUniformLocation;
let rockProgramHalfWindowSizeUniformLocation: WebGLUniformLocation;
let rockProgramZoomUniformLocation: WebGLUniformLocation;
let rockProgramTextureUniformLocation: WebGLUniformLocation;

let highlightsProgramTexture1UniformLocation: WebGLUniformLocation;
let highlightsProgramTexture2UniformLocation: WebGLUniformLocation;
let highlightsProgramTexture3UniformLocation: WebGLUniformLocation;

let noiseTextureUniformLocation: WebGLUniformLocation;

let transitionProgramPlayerPosUniformLocation: WebGLUniformLocation;
let transitionProgramHalfWindowSizeUniformLocation: WebGLUniformLocation;
let transitionProgramZoomUniformLocation: WebGLUniformLocation;
let transitionTextureUniformLocation: WebGLUniformLocation;

let foamProgramSteppingStoneTextureUniformLocation: WebGLUniformLocation;
let foamProgramFoamTextureUniformLocation: WebGLUniformLocation;

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

let highlightsProgramPositionAttribLocation: GLint;
let highlightsProgramCoordAttribLocation: GLint;
let highlightsProgramFadeProgressAttribLocation: GLint;

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

let foamProgramPositionAttribLocation: GLint;
let foamProgramTexCoordAttribLocation: GLint;
let foamProgramTextureOffsetAttribLocation: GLint;

let steppingStoneProgramPositionAttribLocation: GLint;
let steppingStoneProgramTexCoordAttribLocation: GLint;

export function createWaterShaders(): void {
   // 
   // Base program
   // 

   baseProgram = createWebGLProgram(baseVertexShaderText, baseFragmentShaderText);

   baseProgramPlayerPosUniformLocation = gl.getUniformLocation(baseProgram, "u_playerPos")!;
   baseProgramHalfWindowSizeUniformLocation = gl.getUniformLocation(baseProgram, "u_halfWindowSize")!;
   baseProgramZoomUniformLocation = gl.getUniformLocation(baseProgram, "u_zoom")!;
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

   rockProgramPlayerPosUniformLocation = gl.getUniformLocation(rockProgram, "u_playerPos")!;
   rockProgramHalfWindowSizeUniformLocation = gl.getUniformLocation(rockProgram, "u_halfWindowSize")!;
   rockProgramZoomUniformLocation = gl.getUniformLocation(rockProgram, "u_zoom")!;
   rockProgramTextureUniformLocation = gl.getUniformLocation(rockProgram, "u_texture")!;

   rockProgramPositionAttribLocation = gl.getAttribLocation(rockProgram, "a_position");
   rockProgramCoordAttribLocation = gl.getAttribLocation(rockProgram, "a_texCoord");
   rockProgramOpacityAttribLocation = gl.getAttribLocation(rockProgram, "a_opacity");
   
   // 
   // Highlights program
   // 

   highlightsProgram = createWebGLProgram(highlightsVertexShaderText, highlightsFragmentShaderText);

   highlightsProgramTexture1UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture1")!;
   highlightsProgramTexture2UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture2")!;
   highlightsProgramTexture3UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture3")!;

   highlightsProgramPositionAttribLocation = gl.getAttribLocation(highlightsProgram, "a_position");
   highlightsProgramCoordAttribLocation = gl.getAttribLocation(highlightsProgram, "a_texCoord");
   highlightsProgramFadeProgressAttribLocation = gl.getAttribLocation(highlightsProgram, "a_fadeProgress");
   
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

   transitionProgramPlayerPosUniformLocation = gl.getUniformLocation(transitionProgram, "u_playerPos")!;
   transitionProgramHalfWindowSizeUniformLocation = gl.getUniformLocation(transitionProgram, "u_halfWindowSize")!;
   transitionProgramZoomUniformLocation = gl.getUniformLocation(transitionProgram, "u_zoom")!;
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
   // Foam program
   // 

   foamProgram = createWebGLProgram(foamVertexShaderText, foamFragmentShaderText);

   foamProgramSteppingStoneTextureUniformLocation = gl.getUniformLocation(foamProgram, "u_steppingStoneTexture")!;
   foamProgramFoamTextureUniformLocation = gl.getUniformLocation(foamProgram, "u_foamTexture")!;
   
   foamProgramPositionAttribLocation = gl.getAttribLocation(foamProgram, "a_position");
   foamProgramTexCoordAttribLocation = gl.getAttribLocation(foamProgram, "a_texCoord");
   foamProgramTextureOffsetAttribLocation = gl.getAttribLocation(foamProgram, "a_textureOffset");
   
   // 
   // Stepping stone program
   // 

   steppingStoneProgram = createWebGLProgram(steppingStoneVertexShaderText, steppingStoneFragmentShaderText);

   steppingStoneTextureUniformLocation = gl.getUniformLocation(steppingStoneProgram, "u_texture")!;

   steppingStoneProgramPositionAttribLocation = gl.getAttribLocation(steppingStoneProgram, "a_position");
   steppingStoneProgramTexCoordAttribLocation = gl.getAttribLocation(steppingStoneProgram, "a_texCoord");
}

const calculateTransitionVertices = (renderChunkX: number, renderChunkY: number): Array<number> => {
   const edgeTileIndexes = new Set<number>();

   const tileMinX = renderChunkX * RENDER_CHUNK_SIZE;
   const tileMaxX = (renderChunkX + 1) * RENDER_CHUNK_SIZE - 1;
   const tileMinY = renderChunkY * RENDER_CHUNK_SIZE;
   const tileMaxY = (renderChunkY + 1) * RENDER_CHUNK_SIZE - 1;
   for (let tileX = tileMinX; tileX <= tileMaxX; tileX++) {
      for (let tileY = tileMinY; tileY <= tileMaxY; tileY++) {
         const tile = Game.board.getTile(tileX, tileY);

         // Only add the neighbouring tiles if the tile is a water tile
         if (tile.type === "water") {
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
      }
   }

   const vertices = new Array<number>();
   
   for (const tileIndex of edgeTileIndexes) {
      const tileX = tileIndex % SETTINGS.BOARD_DIMENSIONS;
      const tileY = Math.floor(tileIndex / SETTINGS.BOARD_DIMENSIONS);

      const tile = Game.board.getTile(tileX, tileY);

      let x1 = tile.x * SETTINGS.TILE_SIZE;
      let x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
      let y1 = tile.y * SETTINGS.TILE_SIZE;
      let y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

      const bottomLeftWaterDistance = calculateDistanceToWater(tile.x, tile.y);
      const bottomRightWaterDistance = calculateDistanceToWater(tile.x + 1, tile.y);
      const topLeftWaterDistance = calculateDistanceToWater(tile.x, tile.y + 1);
      const topRightWaterDistance = calculateDistanceToWater(tile.x + 1, tile.y + 1);

      const topMarker = waterEdgeDist(tile.x, tile.y + 1);
      const rightMarker = waterEdgeDist(tile.x - 1, tile.y);
      const leftMarker = waterEdgeDist(tile.x + 1, tile.y);
      const bottomMarker = waterEdgeDist(tile.x, tile.y - 1);
      
      vertices.push(
         x1, y1, 0, 0, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x2, y1, 1, 0, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x1, y2, 0, 1, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x1, y2, 0, 1, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x2, y1, 1, 0, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker,
         x2, y2, 1, 1, bottomLeftWaterDistance, bottomRightWaterDistance, topLeftWaterDistance, topRightWaterDistance, topMarker, rightMarker, leftMarker, bottomMarker
      );
   }

   return vertices;
}

const calculateRockVertices = (renderChunkX: number, renderChunkY: number): Array<Array<number>> => {
   const vertexArrays = [ [], [] ] as Array<Array<number>>;

   const minChunkX = Math.floor(renderChunkX * RENDER_CHUNK_SIZE / SETTINGS.CHUNK_SIZE);
   const maxChunkX = Math.floor((renderChunkX + 1) * RENDER_CHUNK_SIZE / SETTINGS.CHUNK_SIZE) - 1;
   const minChunkY = Math.floor(renderChunkY * RENDER_CHUNK_SIZE / SETTINGS.CHUNK_SIZE);
   const maxChunkY = Math.floor((renderChunkY + 1) * RENDER_CHUNK_SIZE / SETTINGS.CHUNK_SIZE) - 1;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
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

            const opacity = lerp(0.15, 0.4, waterRock.opacity);

            vertexArrays[waterRock.size].push(
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

   return vertexArrays;
}

const calculateBaseVertices = (renderChunkX: number, renderChunkY: number): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   const minTileX = renderChunkX * RENDER_CHUNK_SIZE;
   const maxTileX = (renderChunkX + 1) * RENDER_CHUNK_SIZE - 1;
   const minTileY = renderChunkY * RENDER_CHUNK_SIZE;
   const maxTileY = (renderChunkY + 1) * RENDER_CHUNK_SIZE - 1;

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Game.board.getTile(tileX, tileY);
         if (tile.type !== "water") {
            continue;
         }

         let x1 = tile.x * SETTINGS.TILE_SIZE;
         let x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
         let y1 = tile.y * SETTINGS.TILE_SIZE;
         let y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;
   
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
   }

   return vertices;
}

export function calculateRiverRenderChunkData(renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo {
   // Create transition buffer
   const transitionVertices = calculateTransitionVertices(renderChunkX, renderChunkY);
   const transitionBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, transitionBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(transitionVertices), gl.STATIC_DRAW);

   const rockVertexArrays = calculateRockVertices(renderChunkX, renderChunkY);

   const rockBuffers = new Array<WebGLBuffer>();
   const rockVertexCounts = new Array<number>();
   for (const vertices of rockVertexArrays) {
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      rockBuffers.push(buffer);
      rockVertexCounts.push(vertices.length);
   }

   const baseVertices = calculateBaseVertices(renderChunkX, renderChunkY);
   const baseBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, baseBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(baseVertices), gl.STATIC_DRAW);

   return {
      transitionBuffer: transitionBuffer,
      transitionVertexCount: transitionVertices.length,
      rockBuffers: rockBuffers,
      rockVertexCounts: rockVertexCounts,
      baseBuffer: baseBuffer,
      baseVertexCount: baseVertices.length
   };
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

const calculateNoiseVertices = (tiles: ReadonlyArray<Tile>): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   for (const tile of tiles) {
      const flowDirection = Game.board.getRiverFlowDirection(tile.x, tile.y);
      
      let x1 = (tile.x - 0.5) * SETTINGS.TILE_SIZE;
      let x2 = (tile.x + 1.5) * SETTINGS.TILE_SIZE;
      let y1 = (tile.y - 0.5) * SETTINGS.TILE_SIZE;
      let y2 = (tile.y + 1.5) * SETTINGS.TILE_SIZE;

      x1 = Camera.calculateXCanvasPosition(x1);
      x2 = Camera.calculateXCanvasPosition(x2);
      y1 = Camera.calculateYCanvasPosition(y1);
      y2 = Camera.calculateYCanvasPosition(y2);

      const epsilon = 0.01;
      const isDiagonal = Math.abs(flowDirection!) > epsilon && Math.abs(flowDirection - Math.PI/2) > epsilon && Math.abs(flowDirection - Math.PI) > epsilon && Math.abs(flowDirection + Math.PI/2) > epsilon;

      const speedMultiplier = 1 + tile.flowOffset / 1.5;
      let offsetVector: Vector;
      if (isDiagonal) {
         const offsetMagnitude = (Game.lastTime * WATER_VISUAL_FLOW_SPEED / 1000 / Math.SQRT2 * speedMultiplier + tile.flowOffset) % 1;
         offsetVector = new Vector(offsetMagnitude * Math.SQRT2, flowDirection);
      } else {
         const offsetMagnitude = (Game.lastTime * WATER_VISUAL_FLOW_SPEED / 1000 * speedMultiplier + tile.flowOffset) % 1;
         offsetVector = new Vector(offsetMagnitude, flowDirection);
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

const calculateVisibleSteppingStones = (): ReadonlySet<RiverSteppingStone> => {
   const visibleSteppingStones = new Set<RiverSteppingStone>();
   
   const visibleChunkBounds = Camera.getVisibleChunkBounds();
   for (let chunkX = visibleChunkBounds[0]; chunkX <= visibleChunkBounds[1]; chunkX++) {
      for (let chunkY = visibleChunkBounds[2]; chunkY <= visibleChunkBounds[3]; chunkY++) {
         const chunk = Game.board.getChunk(chunkX, chunkY);
         for (const riverSteppingStone of chunk.riverSteppingStones) {
            visibleSteppingStones.add(riverSteppingStone);
         }
      }
   }

   return visibleSteppingStones;
}

const calculateFoamVertices = (visibleSteppingStones: ReadonlySet<RiverSteppingStone>): Record<string, ReadonlyArray<number>> => {
   const vertexRecord: Record<string, Array<number>> = {};

   for (const steppingStone of visibleSteppingStones) {
      const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
      
      let x1 = (steppingStone.position.x - size/2 - FOAM_PADDING);
      let x2 = (steppingStone.position.x + size/2 + FOAM_PADDING);
      let y1 = (steppingStone.position.y - size/2 - FOAM_PADDING);
      let y2 = (steppingStone.position.y + size/2 + FOAM_PADDING);

      let topLeft = new Point(x1, y2);
      let topRight = new Point(x2, y2);
      let bottomRight = new Point(x2, y1);
      let bottomLeft = new Point(x1, y1);

      const pos = new Point(steppingStone.position.x, steppingStone.position.y);

      // Rotate the points to match the entity's rotation
      topLeft = rotatePoint(topLeft, pos, steppingStone.rotation);
      topRight = rotatePoint(topRight, pos, steppingStone.rotation);
      bottomRight = rotatePoint(bottomRight, pos, steppingStone.rotation);
      bottomLeft = rotatePoint(bottomLeft, pos, steppingStone.rotation);

      const tileX = Math.floor(steppingStone.position.x / SETTINGS.TILE_SIZE);
      const tileY = Math.floor(steppingStone.position.y / SETTINGS.TILE_SIZE);
      const tile = Game.board.getTile(tileX, tileY);
      const flowDirection = Game.board.getRiverFlowDirection(tileX, tileY);

      const offset = new Vector(FOAM_OFFSET, flowDirection).convertToPoint();
      topLeft.x -= offset.x;
      topRight.x -= offset.x;
      bottomLeft.x -= offset.x;
      bottomRight.x -= offset.x;
      topLeft.y -= offset.y;
      topRight.y -= offset.y;
      bottomLeft.y -= offset.y;
      bottomRight.y -= offset.y;

      topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
      topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
      bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));
      bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));

      // Create the foam scrolling effect
      const foamTextureOffsetMagnitude = (Game.lastTime * WATER_VISUAL_FLOW_SPEED / 1000 + tile.flowOffset);
      const foamTextureOffset = new Vector(foamTextureOffsetMagnitude, -steppingStone.rotation + flowDirection).convertToPoint();
      foamTextureOffset.x = foamTextureOffset.x % 1;
      foamTextureOffset.y = foamTextureOffset.y % 1;
      
      const textureSource = RIVER_STEPPING_STONE_TEXTURES[steppingStone.size];
      if (!vertexRecord.hasOwnProperty(textureSource)) {
         vertexRecord[textureSource] = [];
      }

      vertexRecord[textureSource].push(
         bottomLeft.x, bottomLeft.y, 0, 0, foamTextureOffset.x, foamTextureOffset.y,
         bottomRight.x, bottomRight.y, 1, 0, foamTextureOffset.x, foamTextureOffset.y,
         topLeft.x, topLeft.y, 0, 1, foamTextureOffset.x, foamTextureOffset.y,
         topLeft.x, topLeft.y, 0, 1, foamTextureOffset.x, foamTextureOffset.y,
         bottomRight.x, bottomRight.y, 1, 0, foamTextureOffset.x, foamTextureOffset.y,
         topRight.x, topRight.y, 1, 1, foamTextureOffset.x, foamTextureOffset.y
      );
   }

   return vertexRecord;
}

const calculateSteppingStoneVertices = (visibleSteppingStones: ReadonlySet<RiverSteppingStone>): Record<string, ReadonlyArray<number>> => {
   const vertexRecord: Record<string, Array<number>> = {};

   for (const steppingStone of visibleSteppingStones) {
      const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
      
      let x1 = (steppingStone.position.x - size/2);
      let x2 = (steppingStone.position.x + size/2);
      let y1 = (steppingStone.position.y - size/2);
      let y2 = (steppingStone.position.y + size/2);

      let topLeft = new Point(x1, y2);
      let topRight = new Point(x2, y2);
      let bottomRight = new Point(x2, y1);
      let bottomLeft = new Point(x1, y1);

      const pos = new Point(steppingStone.position.x, steppingStone.position.y);

      // Rotate the points to match the entity's rotation
      topLeft = rotatePoint(topLeft, pos, steppingStone.rotation);
      topRight = rotatePoint(topRight, pos, steppingStone.rotation);
      bottomRight = rotatePoint(bottomRight, pos, steppingStone.rotation);
      bottomLeft = rotatePoint(bottomLeft, pos, steppingStone.rotation);

      topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
      topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
      bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));
      bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));

      const textureSource = RIVER_STEPPING_STONE_TEXTURES[steppingStone.size];
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

   return vertexRecord;
}

const calculateHighlightsVertices = (tiles: ReadonlyArray<Tile>): ReadonlyArray<number> => {
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

      const fadeProgress = (Game.lastTime / 3000 + tile.flowOffset) % 3;

      vertices.push(
         x1, y1, 0, 0, fadeProgress,
         x2, y1, 1, 0, fadeProgress,
         x1, y2, 0, 1, fadeProgress,
         x1, y2, 0, 1, fadeProgress,
         x2, y1, 1, 0, fadeProgress,
         x2, y2, 1, 1, fadeProgress
      );
   }

   return vertices;
}
const calculateVisibleRenderChunks = (): ReadonlyArray<RenderChunkRiverInfo> => {
   const renderChunks = new Array<RenderChunkRiverInfo>();

   const [minRenderChunkX, maxRenderChunkX, minRenderChunkY, maxRenderChunkY] = Camera.calculateVisibleRenderChunkBounds();

   for (let renderChunkX = minRenderChunkX; renderChunkX <= maxRenderChunkX; renderChunkX++) {
      for (let renderChunkY = minRenderChunkY; renderChunkY <= maxRenderChunkY; renderChunkY++) {
         const renderChunkInfo = getRenderChunkRiverInfo(renderChunkX, renderChunkY);
         renderChunks.push(renderChunkInfo);
      }
   }

   return renderChunks;
}

export function renderWater(): void {
   const visibleRenderChunks = calculateVisibleRenderChunks();
   const visibleTiles = calculateVisibleWaterTiles();
   const visibleSteppingStones = calculateVisibleSteppingStones();

   // const baseVertices = calculateBaseVertices(visibleTiles);
   const noiseVertices = calculateNoiseVertices(visibleTiles);
   const highlightsVertices = calculateHighlightsVertices(visibleTiles);
   const foamVertexRecord = calculateFoamVertices(visibleSteppingStones);
   const steppingStoneVertices = calculateSteppingStoneVertices(visibleSteppingStones);
   
   // 
   // Base program
   // 
   
   gl.useProgram(baseProgram);

   for (const renderChunkInfo of visibleRenderChunks) {
      gl.bindBuffer(gl.ARRAY_BUFFER, renderChunkInfo.baseBuffer);
      
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
      
      gl.uniform2f(baseProgramPlayerPosUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(baseProgramHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(baseProgramZoomUniformLocation, Camera.zoom);
      gl.uniform1i(baseTextureUniformLocation, 0);
      gl.uniform3f(shallowWaterColourUniformLocation, SHALLOW_WATER_COLOUR[0], SHALLOW_WATER_COLOUR[1], SHALLOW_WATER_COLOUR[2]);
      gl.uniform3f(deepWaterColourUniformLocation, DEEP_WATER_COLOUR[0], DEEP_WATER_COLOUR[1], DEEP_WATER_COLOUR[2]);

      const texture = getTexture("tiles/water-base.png");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.baseVertexCount / 8);
   }
   
   // 
   // Rock program
   // 

   gl.useProgram(rockProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   for (const renderChunkRiverInfo of visibleRenderChunks) {
      for (let rockSize: WaterRockSize = 0; rockSize < 2; rockSize++) {
         gl.bindBuffer(gl.ARRAY_BUFFER, renderChunkRiverInfo.rockBuffers[rockSize]);
      
         gl.vertexAttribPointer(rockProgramPositionAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
         gl.vertexAttribPointer(rockProgramCoordAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
         gl.vertexAttribPointer(rockProgramOpacityAttribLocation, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
         
         // Enable the attributes
         gl.enableVertexAttribArray(rockProgramPositionAttribLocation);
         gl.enableVertexAttribArray(rockProgramCoordAttribLocation);
         gl.enableVertexAttribArray(rockProgramOpacityAttribLocation);
         
         gl.uniform2f(rockProgramPlayerPosUniformLocation, Camera.position.x, Camera.position.y);
         gl.uniform2f(rockProgramHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
         gl.uniform1f(rockProgramZoomUniformLocation, Camera.zoom);
         gl.uniform1i(rockProgramTextureUniformLocation, 0);

         const textureSource = WATER_ROCK_TEXTURES[rockSize];
         const texture = getTexture(textureSource);
         gl.activeTexture(gl.TEXTURE0);
         gl.bindTexture(gl.TEXTURE_2D, texture);
         
         // Draw the tile
         gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.rockVertexCounts[rockSize] / 5);
      }
   }

   // 
   // Highlights program
   // 

   gl.useProgram(highlightsProgram);
   
   {
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(highlightsVertices), gl.STATIC_DRAW);
   
      gl.vertexAttribPointer(highlightsProgramPositionAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(highlightsProgramCoordAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(highlightsProgramFadeProgressAttribLocation, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      
      // Enable the attributes
      gl.enableVertexAttribArray(highlightsProgramPositionAttribLocation);
      gl.enableVertexAttribArray(highlightsProgramCoordAttribLocation);
      gl.enableVertexAttribArray(highlightsProgramFadeProgressAttribLocation);
      
      gl.uniform1i(highlightsProgramTexture1UniformLocation, 0);
      gl.uniform1i(highlightsProgramTexture2UniformLocation, 1);
      gl.uniform1i(highlightsProgramTexture3UniformLocation, 2);

      const texture1 = getTexture("tiles/river-bed-highlights-1.png");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture1);

      const texture2 = getTexture("tiles/river-bed-highlights-2.png");
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texture2);

      const texture3 = getTexture("tiles/river-bed-highlights-3.png");
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texture3);
      
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, highlightsVertices.length / 5);
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

   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindBuffer(gl.ARRAY_BUFFER, renderChunkRiverInfo.transitionBuffer);
   
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
      
      gl.uniform2f(transitionProgramPlayerPosUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(transitionProgramHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(transitionProgramZoomUniformLocation, Camera.zoom);
      gl.uniform1i(transitionTextureUniformLocation, 0);
      
      // Set transition texture
      const transitionTexture = getTexture("tiles/gravel.png");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, transitionTexture);
   
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.transitionVertexCount / 12);
   }
   
   // 
   // Foam program
   // 

   gl.useProgram(foamProgram);
   
   for (const [textureSource, vertices] of Object.entries(foamVertexRecord)) {
      // Create tile buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
      gl.vertexAttribPointer(foamProgramPositionAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(foamProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(foamProgramTextureOffsetAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      
      // Enable the attributes
      gl.enableVertexAttribArray(foamProgramPositionAttribLocation);
      gl.enableVertexAttribArray(foamProgramTexCoordAttribLocation);
      gl.enableVertexAttribArray(foamProgramTextureOffsetAttribLocation);
      
      gl.uniform1i(foamProgramSteppingStoneTextureUniformLocation, 0);
      gl.uniform1i(foamProgramFoamTextureUniformLocation, 1);

      const steppingStoneTexture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture);

      const foamTexture = getTexture("tiles/water-foam.png");
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, foamTexture);
      
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6);
   }
   
   // 
   // Stepping stone program
   // 

   gl.useProgram(steppingStoneProgram);
   
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