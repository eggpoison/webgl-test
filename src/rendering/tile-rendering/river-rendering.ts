import { Point, RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneSize, SETTINGS, Vector, WaterRockSize, lerp, randFloat, rotatePoint } from "webgl-test-shared";
import { createWebGLProgram, gl, halfWindowHeight, halfWindowWidth } from "../../webgl";
import Game from "../../Game";
import { getTexture } from "../../textures";
import Camera from "../../Camera";
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

const baseVertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

in vec2 a_position;
in vec2 a_coord;
in float a_topLeftLandDistance;
in float a_topRightLandDistance;
in float a_bottomLeftLandDistance;
in float a_bottomRightLandDistance;

out vec2 v_coord;
out float v_topLeftLandDistance;
out float v_topRightLandDistance;
out float v_bottomLeftLandDistance;
out float v_bottomRightLandDistance;
 
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

const baseFragmentShaderText = `#version 300 es
precision mediump float;

uniform sampler2D u_baseTexture;
uniform vec3 u_shallowWaterColour;
uniform vec3 u_deepWaterColour;
 
in vec2 v_coord;
in float v_topLeftLandDistance;
in float v_topRightLandDistance;
in float v_bottomLeftLandDistance;
in float v_bottomRightLandDistance;

out vec4 outputColour;

void main() {
   float a = mix(v_bottomLeftLandDistance, v_bottomRightLandDistance, v_coord.x);
   float b = mix(v_topLeftLandDistance, v_topRightLandDistance, v_coord.x);
   float dist = mix(a, b, v_coord.y);

   vec3 colour = mix(u_shallowWaterColour, u_deepWaterColour, dist);
   vec4 colourWithAlpha = vec4(colour, 1.0);

   vec4 textureColour = texture(u_baseTexture, v_coord);

   outputColour = colourWithAlpha * textureColour;
}
`;

// Rock shaders

const rockVertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

in vec2 a_position;
in vec2 a_texCoord;
in float a_opacity;

out vec2 v_texCoord;
out float v_opacity;
 
void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_opacity = a_opacity;
}
`;

const rockFragmentShaderText = `#version 300 es
precision mediump float;
 
uniform sampler2D u_texture;
 
in vec2 v_texCoord;
in float v_opacity;

out vec4 outputColour;
 
void main() {
   outputColour = texture(u_texture, v_texCoord);
   outputColour.a *= v_opacity;
}
`;

// Highlights shaders

const highlightsVertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

in vec2 a_position;
in vec2 a_texCoord;
in float a_fadeOffset;

out vec2 v_texCoord;
out float v_fadeOffset;
 
void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_fadeOffset = a_fadeOffset;
}
`;

const highlightsFragmentShaderText = `#version 300 es
precision mediump float;
 
uniform float u_fadeProgress;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;

in vec2 v_texCoord;
in float v_fadeOffset;

out vec4 outputColour;
 
void main() {
   float fadeProgress = u_fadeProgress + v_fadeOffset;
   fadeProgress = mod(fadeProgress, 3.0);
   
   if (fadeProgress < 1.0) {
      vec4 texture1Colour = texture(u_texture1, v_texCoord);
      vec4 texture2Colour = texture(u_texture2, v_texCoord);
      outputColour = mix(texture1Colour, texture2Colour, fadeProgress);
   } else if (fadeProgress < 2.0) {
      vec4 texture2Colour = texture(u_texture2, v_texCoord);
      vec4 texture3Colour = texture(u_texture3, v_texCoord);
      outputColour = mix(texture2Colour, texture3Colour, fadeProgress - 1.0);
   } else {
      vec4 texture3Colour = texture(u_texture3, v_texCoord);
      vec4 texture1Colour = texture(u_texture1, v_texCoord);
      outputColour = mix(texture3Colour, texture1Colour, fadeProgress - 2.0);
   }

   outputColour.a *= 0.4;
}
`;

// Noise shaders

const noiseVertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

in vec2 a_position;
in vec2 a_texCoord;
in vec2 a_flowDirection;
in float a_animationOffset;
in float a_animationSpeed;

out vec2 v_texCoord;
out vec2 v_flowDirection;
out float v_animationOffset;
out float v_animationSpeed;

void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_flowDirection = a_flowDirection;
   v_animationOffset = a_animationOffset;
   v_animationSpeed = a_animationSpeed;
}
`;

const noiseFragmentShaderText = `#version 300 es
precision mediump float;
 
uniform sampler2D u_noiseTexture;
uniform float u_animationOffset;
 
in vec2 v_texCoord;
in vec2 v_flowDirection;
in float v_animationOffset;
in float v_animationSpeed;

out vec4 outputColour;
 
void main() {
   float animationOffset = u_animationOffset * v_animationSpeed + v_animationOffset;
   vec2 offsetCoord = v_flowDirection * animationOffset;
   outputColour = texture(u_noiseTexture, fract(v_texCoord - offsetCoord));

   outputColour.r += 0.5;
   outputColour.g += 0.5;
   outputColour.b += 0.5;

   float distanceFromCenter = max(abs(v_texCoord.x - 0.5), abs(v_texCoord.y - 0.5));
   if (distanceFromCenter >= 0.166) {
      outputColour.a *= mix(1.0, 0.0, (distanceFromCenter - 0.166) * 3.0);
   }
}
`;

// Transition shaders

const transitionVertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

in vec2 a_position;
in vec2 a_texCoord;
in float a_topLeftMarker;
in float a_topRightMarker;
in float a_bottomLeftMarker;
in float a_bottomRightMarker;
in float a_topMarker;
in float a_rightMarker;
in float a_leftMarker;
in float a_bottomMarker;

out vec2 v_texCoord;
out float v_topLeftMarker;
out float v_topRightMarker;
out float v_bottomLeftMarker;
out float v_bottomRightMarker;
out float v_topMarker;
out float v_rightMarker;
out float v_leftMarker;
out float v_bottomMarker;
 
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

const transitionFragmentShaderText = `#version 300 es
precision mediump float;

uniform sampler2D u_transitionTexture;
 
in vec2 v_texCoord;
in float v_topLeftMarker;
in float v_topRightMarker;
in float v_bottomLeftMarker;
in float v_bottomRightMarker;
in float v_topMarker;
in float v_rightMarker;
in float v_leftMarker;
in float v_bottomMarker;

out vec4 outputColour;

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
   
   outputColour = texture(u_transitionTexture, v_texCoord);
   outputColour.a = dist;
}
`;

// Foam shaders

const foamVertexShaderText = `#version 300 es
precision mediump float;

in vec2 a_position;
in vec2 a_texCoord;
in vec2 a_textureOffset;

out vec2 v_texCoord;
out vec2 v_textureOffset;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_textureOffset = a_textureOffset;
}
`;

const foamFragmentShaderText = `#version 300 es
precision mediump float;
 
uniform sampler2D u_steppingStoneTexture;
uniform sampler2D u_foamTexture;
 
in vec2 v_texCoord;
in vec2 v_textureOffset;

out vec4 outputColour;
 
void main() {
   vec4 steppingStoneColour = texture(u_steppingStoneTexture, v_texCoord);
   
   vec2 foamCoord = fract(v_texCoord - v_textureOffset);
   outputColour = texture(u_foamTexture, foamCoord);
   outputColour.a *= steppingStoneColour.a;

   float distFromCenter = distance(v_texCoord, vec2(0.5, 0.5));
   float multiplier = 1.0 - distFromCenter * 2.0;
   multiplier = pow(multiplier, 0.25);
   outputColour.a *= multiplier;
}
`;

// Stepping stone shaders

const steppingStoneVertexShaderText = `#version 300 es
precision mediump float;

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
}
`;

const steppingStoneFragmentShaderText = `#version 300 es
precision mediump float;
 
uniform sampler2D u_texture;
 
in vec2 v_texCoord;

out vec4 outputColour;
 
void main() {
   outputColour = texture(u_texture, v_texCoord);
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

let highlightsProgramPlayerPosUniformLocation: WebGLUniformLocation;
let highlightsProgramHalfWindowSizeUniformLocation: WebGLUniformLocation;
let highlightsProgramZoomUniformLocation: WebGLUniformLocation;
let highlightsProgramFadeProgressUniformLocation: WebGLUniformLocation;
let highlightsProgramTexture1UniformLocation: WebGLUniformLocation;
let highlightsProgramTexture2UniformLocation: WebGLUniformLocation;
let highlightsProgramTexture3UniformLocation: WebGLUniformLocation;

let noiseProgramPlayerPosUniformLocation: WebGLUniformLocation;
let noiseProgramHalfWindowSizeUniformLocation: WebGLUniformLocation;
let noiseProgramZoomUniformLocation: WebGLUniformLocation;
let noiseTextureUniformLocation: WebGLUniformLocation;
let noiseAnimationOffsetUniformLocation: WebGLUniformLocation;

let transitionProgramPlayerPosUniformLocation: WebGLUniformLocation;
let transitionProgramHalfWindowSizeUniformLocation: WebGLUniformLocation;
let transitionProgramZoomUniformLocation: WebGLUniformLocation;
let transitionTextureUniformLocation: WebGLUniformLocation;

let foamProgramSteppingStoneTextureUniformLocation: WebGLUniformLocation;
let foamProgramFoamTextureUniformLocation: WebGLUniformLocation;

let steppingStoneTextureUniformLocation: WebGLUniformLocation;

let foamProgramTexCoordAttribLocation: GLint;
let foamProgramTextureOffsetAttribLocation: GLint;

let steppingStoneProgramTexCoordAttribLocation: GLint;

export function createWaterShaders(): void {
   // 
   // Base program
   // 

   baseProgram = createWebGLProgram(gl, baseVertexShaderText, baseFragmentShaderText);

   baseProgramPlayerPosUniformLocation = gl.getUniformLocation(baseProgram, "u_playerPos")!;
   baseProgramHalfWindowSizeUniformLocation = gl.getUniformLocation(baseProgram, "u_halfWindowSize")!;
   baseProgramZoomUniformLocation = gl.getUniformLocation(baseProgram, "u_zoom")!;
   baseTextureUniformLocation = gl.getUniformLocation(baseProgram, "u_baseTexture")!;
   shallowWaterColourUniformLocation = gl.getUniformLocation(baseProgram, "u_shallowWaterColour")!;
   deepWaterColourUniformLocation = gl.getUniformLocation(baseProgram, "u_deepWaterColour")!;

   // 
   // Rock program
   // 

   rockProgram = createWebGLProgram(gl, rockVertexShaderText, rockFragmentShaderText);

   rockProgramPlayerPosUniformLocation = gl.getUniformLocation(rockProgram, "u_playerPos")!;
   rockProgramHalfWindowSizeUniformLocation = gl.getUniformLocation(rockProgram, "u_halfWindowSize")!;
   rockProgramZoomUniformLocation = gl.getUniformLocation(rockProgram, "u_zoom")!;
   rockProgramTextureUniformLocation = gl.getUniformLocation(rockProgram, "u_texture")!;
   
   // 
   // Highlights program
   // 

   highlightsProgram = createWebGLProgram(gl, highlightsVertexShaderText, highlightsFragmentShaderText);

   highlightsProgramPlayerPosUniformLocation = gl.getUniformLocation(highlightsProgram, "u_playerPos")!;
   highlightsProgramHalfWindowSizeUniformLocation = gl.getUniformLocation(highlightsProgram, "u_halfWindowSize")!;
   highlightsProgramZoomUniformLocation = gl.getUniformLocation(highlightsProgram, "u_zoom")!;
   highlightsProgramFadeProgressUniformLocation = gl.getUniformLocation(highlightsProgram, "u_fadeProgress")!;
   highlightsProgramTexture1UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture1")!;
   highlightsProgramTexture2UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture2")!;
   highlightsProgramTexture3UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture3")!;
   
   // 
   // Noise program
   // 

   noiseProgram = createWebGLProgram(gl, noiseVertexShaderText, noiseFragmentShaderText);

   noiseProgramPlayerPosUniformLocation = gl.getUniformLocation(noiseProgram, "u_playerPos")!;
   noiseProgramHalfWindowSizeUniformLocation = gl.getUniformLocation(noiseProgram, "u_halfWindowSize")!;
   noiseProgramZoomUniformLocation = gl.getUniformLocation(noiseProgram, "u_zoom")!;
   noiseTextureUniformLocation = gl.getUniformLocation(noiseProgram, "u_noiseTexture")!;
   noiseAnimationOffsetUniformLocation = gl.getUniformLocation(noiseProgram, "u_animationOffset")!;

   // 
   // Transition program
   // 

   transitionProgram = createWebGLProgram(gl, transitionVertexShaderText, transitionFragmentShaderText);

   transitionProgramPlayerPosUniformLocation = gl.getUniformLocation(transitionProgram, "u_playerPos")!;
   transitionProgramHalfWindowSizeUniformLocation = gl.getUniformLocation(transitionProgram, "u_halfWindowSize")!;
   transitionProgramZoomUniformLocation = gl.getUniformLocation(transitionProgram, "u_zoom")!;
   transitionTextureUniformLocation = gl.getUniformLocation(transitionProgram, "u_transitionTexture")!;
   
   // 
   // Foam program
   // 

   foamProgram = createWebGLProgram(gl, foamVertexShaderText, foamFragmentShaderText);

   foamProgramSteppingStoneTextureUniformLocation = gl.getUniformLocation(foamProgram, "u_steppingStoneTexture")!;
   foamProgramFoamTextureUniformLocation = gl.getUniformLocation(foamProgram, "u_foamTexture")!;
   
   gl.bindAttribLocation(foamProgram, 0, "a_position");
   foamProgramTexCoordAttribLocation = gl.getAttribLocation(foamProgram, "a_texCoord");
   foamProgramTextureOffsetAttribLocation = gl.getAttribLocation(foamProgram, "a_textureOffset");
   
   // 
   // Stepping stone program
   // 

   steppingStoneProgram = createWebGLProgram(gl, steppingStoneVertexShaderText, steppingStoneFragmentShaderText);

   steppingStoneTextureUniformLocation = gl.getUniformLocation(steppingStoneProgram, "u_texture")!;

   gl.bindAttribLocation(steppingStoneProgram, 0, "a_position");
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

const createBaseVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   const baseProgramCoordAttribLocation = gl.getAttribLocation(baseProgram, "a_coord");
   const baseProgramTopLeftLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_topLeftLandDistance");
   const baseProgramTopRightLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_topRightLandDistance");
   const baseProgramBottomLeftLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_bottomLeftLandDistance");
   const baseProgramBottomRightLandDistanceAttribLocation = gl.getAttribLocation(baseProgram, "a_bottomRightLandDistance");
      
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(baseProgramCoordAttribLocation, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(baseProgramBottomLeftLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(baseProgramBottomRightLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(baseProgramTopLeftLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(baseProgramTopRightLandDistanceAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   
   // Enable the attributes
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(baseProgramCoordAttribLocation);
   gl.enableVertexAttribArray(baseProgramBottomLeftLandDistanceAttribLocation);
   gl.enableVertexAttribArray(baseProgramBottomRightLandDistanceAttribLocation);
   gl.enableVertexAttribArray(baseProgramTopLeftLandDistanceAttribLocation);
   gl.enableVertexAttribArray(baseProgramTopRightLandDistanceAttribLocation);

   gl.bindVertexArray(null);

   return vao;
}

const createRockVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   const rockProgramCoordAttribLocation = gl.getAttribLocation(rockProgram, "a_texCoord");
   const rockProgramOpacityAttribLocation = gl.getAttribLocation(rockProgram, "a_opacity");
      
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(rockProgramCoordAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(rockProgramOpacityAttribLocation, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(rockProgramCoordAttribLocation);
   gl.enableVertexAttribArray(rockProgramOpacityAttribLocation);

   gl.bindVertexArray(null);

   return vao;
}

const createHighlightsVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   const highlightsProgramCoordAttribLocation = gl.getAttribLocation(highlightsProgram, "a_texCoord");
   const highlightsProgramFadeOffsetAttribLocation = gl.getAttribLocation(highlightsProgram, "a_fadeOffset");

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(highlightsProgramCoordAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(highlightsProgramFadeOffsetAttribLocation, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(highlightsProgramCoordAttribLocation);
   gl.enableVertexAttribArray(highlightsProgramFadeOffsetAttribLocation);

   gl.bindVertexArray(null);

   return vao;
}

const createNoiseVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   const noiseProgramTexCoordAttribLocation = gl.getAttribLocation(noiseProgram, "a_texCoord");
   const noiseFlowDirectionAttribLocation = gl.getAttribLocation(noiseProgram, "a_flowDirection");
   const noiseAnimationOffsetAttribLocation = gl.getAttribLocation(noiseProgram, "a_animationOffset");
   const noiseAnimationSpeedAttribLocation = gl.getAttribLocation(noiseProgram, "a_animationSpeed");
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(noiseProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(noiseFlowDirectionAttribLocation, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(noiseAnimationOffsetAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(noiseAnimationSpeedAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);

   // Enable the attributes
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(noiseProgramTexCoordAttribLocation);
   gl.enableVertexAttribArray(noiseFlowDirectionAttribLocation);
   gl.enableVertexAttribArray(noiseAnimationOffsetAttribLocation);
   gl.enableVertexAttribArray(noiseAnimationSpeedAttribLocation);

   gl.bindVertexArray(null);

   return vao;
}

const createTransitionVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   const transitionProgramTexCoordAttribLocation = gl.getAttribLocation(transitionProgram, "a_texCoord");
   const transitionProgramTopLeftMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_topLeftMarker");
   const transitionProgramTopRightMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_topRightMarker");
   const transitionProgramBottomLeftMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_bottomLeftMarker");
   const transitionProgramBottomRightMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_bottomRightMarker");
   const transitionProgramTopMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_topMarker");
   const transitionProgramRightMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_rightMarker");
   const transitionProgramLeftMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_leftMarker");
   const transitionProgramBottomMarkerAttribLocation = gl.getAttribLocation(transitionProgram, "a_bottomMarker");
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(transitionProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(transitionProgramBottomLeftMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(transitionProgramBottomRightMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(transitionProgramTopLeftMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(transitionProgramTopRightMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(transitionProgramTopMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(transitionProgramRightMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 9 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(transitionProgramLeftMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 10 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(transitionProgramBottomMarkerAttribLocation, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(transitionProgramTexCoordAttribLocation);
   gl.enableVertexAttribArray(transitionProgramBottomLeftMarkerAttribLocation);
   gl.enableVertexAttribArray(transitionProgramBottomRightMarkerAttribLocation);
   gl.enableVertexAttribArray(transitionProgramTopLeftMarkerAttribLocation);
   gl.enableVertexAttribArray(transitionProgramTopRightMarkerAttribLocation);
   gl.enableVertexAttribArray(transitionProgramTopMarkerAttribLocation);
   gl.enableVertexAttribArray(transitionProgramRightMarkerAttribLocation);
   gl.enableVertexAttribArray(transitionProgramLeftMarkerAttribLocation);
   gl.enableVertexAttribArray(transitionProgramBottomMarkerAttribLocation);

   gl.bindVertexArray(null);

   return vao;
}

export function calculateRiverRenderChunkData(renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo {
   // TODO: Calculate visible water tiles and pass them into all these functions

   const baseVertices = calculateBaseVertices(renderChunkX, renderChunkY);
   const baseBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, baseBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(baseVertices), gl.STATIC_DRAW);

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

   const highlightsVertices = calculateHighlightsVertices(renderChunkX, renderChunkY);
   const highlightsBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, highlightsBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(highlightsVertices), gl.STATIC_DRAW);

   const noiseVertices = calculateNoiseVertices(renderChunkX, renderChunkY);
   const noiseBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, noiseBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(noiseVertices), gl.STATIC_DRAW);

   return {
      baseVAO: createBaseVAO(baseBuffer),
      baseVertexCount: baseVertices.length,
      rockVAOs: rockBuffers.map(buffer => createRockVAO(buffer)),
      rockVertexCounts: rockVertexCounts,
      highlightsVAO: createHighlightsVAO(highlightsBuffer),
      highlightsVertexCount: highlightsVertices.length,
      transitionVAO: createTransitionVAO(transitionBuffer),
      transitionVertexCount: transitionVertices.length,
      noiseVAO: createNoiseVAO(noiseBuffer),
      noiseVertexCount: noiseVertices.length
   };
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

const calculateNoiseVertices = (renderChunkX: number, renderChunkY: number): ReadonlyArray<number> => {
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
         const flowDirection = Game.board.getRiverFlowDirection(tileX, tileY);
         
         const x1 = (tileX - 0.5) * SETTINGS.TILE_SIZE;
         const x2 = (tileX + 1.5) * SETTINGS.TILE_SIZE;
         const y1 = (tileY - 0.5) * SETTINGS.TILE_SIZE;
         const y2 = (tileY + 1.5) * SETTINGS.TILE_SIZE;

         const animationOffset = Math.random();
         const animationSpeed = randFloat(1, 1.67);
         
         const flowDirectionX = Math.sin(flowDirection);
         const flowDirectionY = Math.cos(flowDirection);

         vertices.push(
            x1, y1, 0, 0, flowDirectionX, flowDirectionY, animationOffset, animationSpeed,
            x2, y1, 1, 0, flowDirectionX, flowDirectionY, animationOffset, animationSpeed,
            x1, y2, 0, 1, flowDirectionX, flowDirectionY, animationOffset, animationSpeed,
            x1, y2, 0, 1, flowDirectionX, flowDirectionY, animationOffset, animationSpeed,
            x2, y1, 1, 0, flowDirectionX, flowDirectionY, animationOffset, animationSpeed,
            x2, y2, 1, 1, flowDirectionX, flowDirectionY, animationOffset, animationSpeed
         );
      }
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

const calculateHighlightsVertices = (renderChunkX: number, renderChunkY: number): ReadonlyArray<number> => {
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

         const x1 = tile.x * SETTINGS.TILE_SIZE;
         const x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
         const y1 = tile.y * SETTINGS.TILE_SIZE;
         const y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

         const fadeOffset = Math.random() * 3;
   
         vertices.push(
            x1, y1, 0, 0, fadeOffset,
            x2, y1, 1, 0, fadeOffset,
            x1, y2, 0, 1, fadeOffset,
            x1, y2, 0, 1, fadeOffset,
            x2, y1, 1, 0, fadeOffset,
            x2, y2, 1, 1, fadeOffset
         );
      }
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

export function renderRivers(): void {
   const visibleRenderChunks = calculateVisibleRenderChunks();
   const visibleSteppingStones = calculateVisibleSteppingStones();

   const foamVertexRecord = calculateFoamVertices(visibleSteppingStones);
   const steppingStoneVertices = calculateSteppingStoneVertices(visibleSteppingStones);
   
   // 
   // Base program
   // 
   
   gl.useProgram(baseProgram);

   // Bind water base texture
   const baseTexture = getTexture("tiles/water-base.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, baseTexture);

   for (const renderChunkInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkInfo.baseVAO);
      
      gl.uniform2f(baseProgramPlayerPosUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(baseProgramHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(baseProgramZoomUniformLocation, Camera.zoom);
      gl.uniform1i(baseTextureUniformLocation, 0);
      gl.uniform3f(shallowWaterColourUniformLocation, SHALLOW_WATER_COLOUR[0], SHALLOW_WATER_COLOUR[1], SHALLOW_WATER_COLOUR[2]);
      gl.uniform3f(deepWaterColourUniformLocation, DEEP_WATER_COLOUR[0], DEEP_WATER_COLOUR[1], DEEP_WATER_COLOUR[2]);
      
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.baseVertexCount / 8);
   }
   
   // 
   // Rock program
   // 

   gl.useProgram(rockProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind water rock textures
   for (let rockSize: WaterRockSize = 0; rockSize < 2; rockSize++) {
      const textureSource = WATER_ROCK_TEXTURES[rockSize];
      const texture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
   }
   
   for (const renderChunkRiverInfo of visibleRenderChunks) {
      for (let rockSize: WaterRockSize = 0; rockSize < 2; rockSize++) {
         gl.bindVertexArray(renderChunkRiverInfo.rockVAOs[rockSize]);
         
         gl.uniform2f(rockProgramPlayerPosUniformLocation, Camera.position.x, Camera.position.y);
         gl.uniform2f(rockProgramHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
         gl.uniform1f(rockProgramZoomUniformLocation, Camera.zoom);
         gl.uniform1i(rockProgramTextureUniformLocation, 0);
         
         gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.rockVertexCounts[rockSize] / 5);
      }
   }

   // 
   // Highlights program
   // 

   gl.useProgram(highlightsProgram);
      
   const highlightsFadeProgress = (Game.lastTime / 3000) % 3;

   const texture1 = getTexture("tiles/river-bed-highlights-1.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, texture1);

   const texture2 = getTexture("tiles/river-bed-highlights-2.png");
   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D, texture2);

   const texture3 = getTexture("tiles/river-bed-highlights-3.png");
   gl.activeTexture(gl.TEXTURE2);
   gl.bindTexture(gl.TEXTURE_2D, texture3);
   
   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkRiverInfo.highlightsVAO);

      gl.uniform2f(highlightsProgramPlayerPosUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(highlightsProgramHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(highlightsProgramZoomUniformLocation, Camera.zoom);
      gl.uniform1f(highlightsProgramFadeProgressUniformLocation, highlightsFadeProgress);
      gl.uniform1i(highlightsProgramTexture1UniformLocation, 0);
      gl.uniform1i(highlightsProgramTexture2UniformLocation, 1);
      gl.uniform1i(highlightsProgramTexture3UniformLocation, 2);
      
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.highlightsVertexCount / 5);
   }
   
   // 
   // Noise program
   // 
   
   gl.useProgram(noiseProgram);
      
   const noiseAnimationOffset = Game.lastTime * WATER_VISUAL_FLOW_SPEED / 1000;
               
   const noiseTexture = getTexture("tiles/water-noise.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, noiseTexture);

   for (const renderChunkInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkInfo.noiseVAO);
      
      gl.uniform2f(noiseProgramPlayerPosUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(noiseProgramHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(noiseProgramZoomUniformLocation, Camera.zoom);
      gl.uniform1i(noiseTextureUniformLocation, 0);
      gl.uniform1f(noiseAnimationOffsetUniformLocation, noiseAnimationOffset);
   
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.noiseVertexCount / 8);
   }

   // 
   // Transition program
   // 

   gl.useProgram(transitionProgram);
      
   // Bind transition texture
   const transitionTexture = getTexture("tiles/gravel.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, transitionTexture);

   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkRiverInfo.transitionVAO);
      
      gl.uniform2f(transitionProgramPlayerPosUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(transitionProgramHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(transitionProgramZoomUniformLocation, Camera.zoom);
      gl.uniform1i(transitionTextureUniformLocation, 0);
   
      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.transitionVertexCount / 12);
   }

   gl.bindVertexArray(null);
   
   // 
   // Foam program
   // 

   gl.useProgram(foamProgram);

   // Bind foam texture
   const foamTexture = getTexture("tiles/water-foam.png");
   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D, foamTexture);
   
   for (const [textureSource, vertices] of Object.entries(foamVertexRecord)) {
      // Create tile buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(foamProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(foamProgramTextureOffsetAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      
      // Enable the attributes
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(foamProgramTexCoordAttribLocation);
      gl.enableVertexAttribArray(foamProgramTextureOffsetAttribLocation);
      
      gl.uniform1i(foamProgramSteppingStoneTextureUniformLocation, 0);
      gl.uniform1i(foamProgramFoamTextureUniformLocation, 1);

      const steppingStoneTexture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture);
      
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
   
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(steppingStoneProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      
      // Enable the attributes
      gl.enableVertexAttribArray(0);
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