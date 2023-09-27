import { Point, RIVER_STEPPING_STONE_SIZES, RiverSteppingStoneSize, SETTINGS, WaterRockSize, lerp, randFloat, rotatePoint } from "webgl-test-shared";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../../webgl";
import { getTexture } from "../../textures";
import Camera from "../../Camera";
import Board, { RiverSteppingStone } from "../../Board";
import { RENDER_CHUNK_SIZE, RenderChunkRiverInfo, getRenderChunkRiverInfo } from "./render-chunks";
import { Tile } from "../../Tile";
import { NEIGHBOUR_OFFSETS } from "../../utils";

const SHALLOW_WATER_COLOUR = [118/255, 185/255, 242/255] as const;
const DEEP_WATER_COLOUR = [86/255, 141/255, 184/255] as const;

const WATER_VISUAL_FLOW_SPEED = 0.3;

/** How much the stepping stone foam should be offset from their stepping stones */
const FOAM_OFFSET = 3;
/** Extra size given to the foam under stepping stones */
const FOAM_PADDING = 3.5;

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

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_coord;
layout(location = 2) in float a_topLeftLandDistance;
layout(location = 3) in float a_topRightLandDistance;
layout(location = 4) in float a_bottomLeftLandDistance;
layout(location = 5) in float a_bottomRightLandDistance;

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
 
in vec2 v_coord;
in float v_topLeftLandDistance;
in float v_topRightLandDistance;
in float v_bottomLeftLandDistance;
in float v_bottomRightLandDistance;

out vec4 outputColour;

void main() {
   float bottomLerp = mix(v_bottomLeftLandDistance, v_bottomRightLandDistance, v_coord.x);
   float topLerp = mix(v_topLeftLandDistance, v_topRightLandDistance, v_coord.x);
   float dist = mix(bottomLerp, topLerp, v_coord.y);

   float r = mix(${SHALLOW_WATER_COLOUR[0]}, ${DEEP_WATER_COLOUR[0]}, dist);
   float g = mix(${SHALLOW_WATER_COLOUR[1]}, ${DEEP_WATER_COLOUR[1]}, dist);
   float b = mix(${SHALLOW_WATER_COLOUR[2]}, ${DEEP_WATER_COLOUR[2]}, dist);
   vec4 colourWithAlpha = vec4(r, g, b, 1.0);

   vec4 textureColour = texture(u_baseTexture, v_coord);

   outputColour = colourWithAlpha * textureColour;
}
`;

// Rock shaders

const rockVertexShaderText = `#version 300 es
precision mediump float;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in float a_opacity;
layout(location = 3) in float a_textureIdx;

out vec2 v_texCoord;
out float v_opacity;
out float v_textureIdx;
 
void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_opacity = a_opacity;
   v_textureIdx = a_textureIdx;
}
`;

const rockFragmentShaderText = `#version 300 es
precision mediump float;
 
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
 
in vec2 v_texCoord;
in float v_opacity;
in float v_textureIdx;

out vec4 outputColour;
 
void main() {
   if (v_textureIdx < 0.5) {
      outputColour = texture(u_texture1, v_texCoord);
   } else {
      outputColour = texture(u_texture2, v_texCoord);
   }
   outputColour.a *= v_opacity;
}
`;

// 
// Highlights shaders
// 

const highlightsVertexShaderText = `#version 300 es
precision mediump float;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in float a_fadeOffset;

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

// 
// Noise shaders
// 

const noiseVertexShaderText = `#version 300 es
precision mediump float;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in vec2 a_flowDirection;
layout(location = 3) in float a_animationOffset;
layout(location = 4) in float a_animationSpeed;

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

// 
// Transition shaders
// 

const transitionVertexShaderText = `#version 300 es
precision mediump float;

#define TILE_SIZE 64.0;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_tile;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in float a_topLeftMarker;
layout(location = 3) in float a_topRightMarker;
layout(location = 4) in float a_bottomLeftMarker;
layout(location = 5) in float a_bottomRightMarker;
layout(location = 6) in float a_topMarker;
layout(location = 7) in float a_rightMarker;
layout(location = 8) in float a_leftMarker;
layout(location = 9) in float a_bottomMarker;

out vec2 v_tile;
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
   vec2 position = a_tile * TILE_SIZE;
   vec2 screenPos = (position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_tile = a_tile;
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

#define NOISE_TEXTURE_SIZE 128

uniform sampler2D u_transitionTexture;
uniform sampler2D u_noiseTexture;
 
in vec2 v_tile;
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

   outputColour = texture(u_transitionTexture, v_texCoord);
   outputColour.a = pow(dist, 0.3);

   // 
   // Account for noise in the opacity
   // 

   vec2 noiseSampleCoord = mod((v_tile + 0.0) / 8.0, 1.0);
   float noise = texture(u_noiseTexture, noiseSampleCoord).r;
   float noiseDist = dist;
   noiseDist *= 2.0;
   noiseDist = pow(noiseDist, 5.0);
   noiseDist -= 0.1;

   float opacitySubtract = noise * 1.3 - 0.3 - min(max(noiseDist, 0.0), 1.0);
   opacitySubtract = noise * 1.3 - 0.3;
   opacitySubtract = pow(opacitySubtract, 1.2);

   outputColour.a -= opacitySubtract;
}
`;

// 
// Foam shaders
// 

const foamVertexShaderText = `#version 300 es
precision mediump float;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in vec2 a_flowDirection;
layout(location = 3) in float a_textureOffset;

out vec2 v_texCoord;
out vec2 v_flowDirection;
out float v_textureOffset;

void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_textureOffset = a_textureOffset;
   v_flowDirection = a_flowDirection;
}
`;

const foamFragmentShaderText = `#version 300 es
precision mediump float;
 
uniform sampler2D u_foamTexture;
uniform float u_textureOffset;
 
in vec2 v_texCoord;
in vec2 v_flowDirection;
in float v_textureOffset;

out vec4 outputColour;
 
void main() {
   float offsetAmount = u_textureOffset + v_textureOffset;
   vec2 offset = v_flowDirection * offsetAmount;
   outputColour = texture(u_foamTexture, fract(v_texCoord - offset));

   float distFromCenter = distance(v_texCoord, vec2(0.5, 0.5));
   float multiplier = 1.0 - distFromCenter * 2.0;
   multiplier = clamp(multiplier, 0.0, 1.0);
   multiplier = pow(multiplier, 0.35);
   outputColour.a *= multiplier;
}
`;

// 
// Stepping stone shaders
// 

const steppingStoneVertexShaderText = `#version 300 es
precision mediump float;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in float a_textureIdx;

out vec2 v_texCoord;
out float v_textureIdx;
 
void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_textureIdx = a_textureIdx;
}
`;

const steppingStoneFragmentShaderText = `#version 300 es
precision mediump float;
 
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;
 
in vec2 v_texCoord;
in float v_textureIdx;

out vec4 outputColour;
 
void main() {
   if (v_textureIdx < 0.5) {
      outputColour = texture(u_texture1, v_texCoord);
   } else if (v_textureIdx < 1.5) {
      outputColour = texture(u_texture2, v_texCoord);
   } else {
      outputColour = texture(u_texture3, v_texCoord);
   }
}
`;

let baseProgram: WebGLProgram;
let rockProgram: WebGLProgram;
let highlightsProgram: WebGLProgram;
let noiseProgram: WebGLProgram;
let transitionProgram: WebGLProgram;
let foamProgram: WebGLProgram;
let steppingStoneProgram: WebGLProgram;

let highlightsProgramFadeProgressUniformLocation: WebGLUniformLocation;

let noiseAnimationOffsetUniformLocation: WebGLUniformLocation;

let foamProgramTextureOffsetUniformLocation: WebGLUniformLocation;

export function createRiverShaders(): void {
   // 
   // Base program
   // 

   baseProgram = createWebGLProgram(gl, baseVertexShaderText, baseFragmentShaderText);

   const baseCameraBlockIndex = gl.getUniformBlockIndex(baseProgram, "Camera");
   gl.uniformBlockBinding(baseProgram, baseCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const baseTextureUniformLocation = gl.getUniformLocation(baseProgram, "u_baseTexture")!;

   gl.useProgram(baseProgram);
   gl.uniform1i(baseTextureUniformLocation, 0);

   // 
   // Rock program
   // 

   rockProgram = createWebGLProgram(gl, rockVertexShaderText, rockFragmentShaderText);

   const rockCameraBlockIndex = gl.getUniformBlockIndex(rockProgram, "Camera");
   gl.uniformBlockBinding(rockProgram, rockCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const rockProgramTexture1UniformLocation = gl.getUniformLocation(rockProgram, "u_texture1")!;
   const rockProgramTexture2UniformLocation = gl.getUniformLocation(rockProgram, "u_texture2")!;

   gl.useProgram(rockProgram);
   gl.uniform1i(rockProgramTexture1UniformLocation, 0);
   gl.uniform1i(rockProgramTexture2UniformLocation, 1);
   
   // 
   // Highlights program
   // 

   highlightsProgram = createWebGLProgram(gl, highlightsVertexShaderText, highlightsFragmentShaderText);

   const highlightsCameraBlockIndex = gl.getUniformBlockIndex(highlightsProgram, "Camera");
   gl.uniformBlockBinding(highlightsProgram, highlightsCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   highlightsProgramFadeProgressUniformLocation = gl.getUniformLocation(highlightsProgram, "u_fadeProgress")!;
   const highlightsProgramTexture1UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture1")!;
   const highlightsProgramTexture2UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture2")!;
   const highlightsProgramTexture3UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture3")!;

   gl.useProgram(highlightsProgram);
   gl.uniform1i(highlightsProgramTexture1UniformLocation, 0);
   gl.uniform1i(highlightsProgramTexture2UniformLocation, 1);
   gl.uniform1i(highlightsProgramTexture3UniformLocation, 2);
   
   // 
   // Noise program
   // 

   noiseProgram = createWebGLProgram(gl, noiseVertexShaderText, noiseFragmentShaderText);

   const noiseCameraBlockIndex = gl.getUniformBlockIndex(noiseProgram, "Camera");
   gl.uniformBlockBinding(noiseProgram, noiseCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const noiseTextureUniformLocation = gl.getUniformLocation(noiseProgram, "u_noiseTexture")!;
   noiseAnimationOffsetUniformLocation = gl.getUniformLocation(noiseProgram, "u_animationOffset")!;

   gl.useProgram(noiseProgram);
   gl.uniform1i(noiseTextureUniformLocation, 0);

   // 
   // Transition program
   // 

   transitionProgram = createWebGLProgram(gl, transitionVertexShaderText, transitionFragmentShaderText);

   const transitionCameraBlockIndex = gl.getUniformBlockIndex(transitionProgram, "Camera");
   gl.uniformBlockBinding(transitionProgram, transitionCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   gl.useProgram(transitionProgram);
   
   const transitionTextureUniformLocation = gl.getUniformLocation(transitionProgram, "u_transitionTexture")!;
   gl.uniform1i(transitionTextureUniformLocation, 0);

   const gravelNoiseTextureUniformLocation = gl.getUniformLocation(transitionProgram, "u_noiseTexture")!;
   gl.uniform1i(gravelNoiseTextureUniformLocation, 1);
   // 
   // Foam program
   // 

   foamProgram = createWebGLProgram(gl, foamVertexShaderText, foamFragmentShaderText);

   const foamCameraBlockIndex = gl.getUniformBlockIndex(foamProgram, "Camera");
   gl.uniformBlockBinding(foamProgram, foamCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const foamProgramFoamTextureUniformLocation = gl.getUniformLocation(foamProgram, "u_foamTexture")!;
   foamProgramTextureOffsetUniformLocation = gl.getUniformLocation(foamProgram, "u_textureOffset")!;

   gl.useProgram(foamProgram);
   gl.uniform1i(foamProgramFoamTextureUniformLocation, 0);
   
   // 
   // Stepping stone program
   // 

   steppingStoneProgram = createWebGLProgram(gl, steppingStoneVertexShaderText, steppingStoneFragmentShaderText);

   const steppingStoneCameraBlockIndex = gl.getUniformBlockIndex(steppingStoneProgram, "Camera");
   gl.uniformBlockBinding(steppingStoneProgram, steppingStoneCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const steppingStoneTexture1UniformLocation = gl.getUniformLocation(steppingStoneProgram, "u_texture1")!;
   const steppingStoneTexture2UniformLocation = gl.getUniformLocation(steppingStoneProgram, "u_texture2")!;
   const steppingStoneTexture3UniformLocation = gl.getUniformLocation(steppingStoneProgram, "u_texture3")!;

   gl.useProgram(steppingStoneProgram);
   gl.uniform1i(steppingStoneTexture1UniformLocation, 0);
   gl.uniform1i(steppingStoneTexture2UniformLocation, 1);
   gl.uniform1i(steppingStoneTexture3UniformLocation, 2);
}

const tileIsWaterInt = (tileX: number, tileY: number): number => {
   if (!Board.tileIsInBoard(tileX, tileY)) {
      return 0;
   }
   
   const tile = Board.getTile(tileX, tileY);
   return tile.type === "water" ? 1 : 0;
}

const calculateTransitionVertexData = (renderChunkX: number, renderChunkY: number): Float32Array => {
   const minTileX = renderChunkX * RENDER_CHUNK_SIZE;
   const maxTileX = (renderChunkX + 1) * RENDER_CHUNK_SIZE - 1;
   const minTileY = renderChunkY * RENDER_CHUNK_SIZE;
   const maxTileY = (renderChunkY + 1) * RENDER_CHUNK_SIZE - 1;

   // Find all tiles neighbouring water in the render chunk
   const edgeTiles = new Array<Tile>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type === "water") {
            continue;
         }

         // Check for neighbouring water tiles
         for (const offset of NEIGHBOUR_OFFSETS) {
            const neighbourTileX = tile.x + offset[0];
            const neighbourTileY = tile.y + offset[1];

            // Don't add tiles which aren't in the board
            if (!Board.tileIsInBoard(neighbourTileX, neighbourTileY)) {
               continue;
            }

            // If the tile is neighbouring water, add it and move on to the next tile
            const neighbourTile = Board.getTile(neighbourTileX, neighbourTileY);
            if (neighbourTile.type === "water") {
               edgeTiles.push(tile);
               break;
            }
         }
      }
   }

   const vertexData = new Float32Array(edgeTiles.length * 6 * 12);
   for (let i = 0; i < edgeTiles.length; i++) {
      const tile = edgeTiles[i];

      let x1 = tile.x;
      let x2 = tile.x + 1;
      let y1 = tile.y;
      let y2 = tile.y + 1;

      const topLeftWaterDistance = 1 - tileIsWaterInt(tile.x - 1, tile.y + 1);
      const topRightWaterDistance = 1 - tileIsWaterInt(tile.x + 1, tile.y + 1);
      const bottomLeftWaterDistance = 1 - tileIsWaterInt(tile.x - 1, tile.y - 1);
      const bottomRightWaterDistance = 1 - tileIsWaterInt(tile.x + 1, tile.y - 1);

      const topMarker = 1 - tileIsWaterInt(tile.x, tile.y + 1);
      const rightMarker = 1 - tileIsWaterInt(tile.x - 1, tile.y);
      const leftMarker = 1 - tileIsWaterInt(tile.x + 1, tile.y);
      const bottomMarker = 1 - tileIsWaterInt(tile.x, tile.y - 1);

      const dataOffset = i * 6 * 12;

      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = topLeftWaterDistance;
      vertexData[dataOffset + 5] = topRightWaterDistance;
      vertexData[dataOffset + 6] = bottomLeftWaterDistance;
      vertexData[dataOffset + 7] = bottomRightWaterDistance;
      vertexData[dataOffset + 8] = topMarker;
      vertexData[dataOffset + 9] = rightMarker;
      vertexData[dataOffset + 10] = leftMarker;
      vertexData[dataOffset + 11] = bottomMarker;

      vertexData[dataOffset + 12] = x2;
      vertexData[dataOffset + 13] = y1;
      vertexData[dataOffset + 14] = 1;
      vertexData[dataOffset + 15] = 0;
      vertexData[dataOffset + 16] = topLeftWaterDistance;
      vertexData[dataOffset + 17] = topRightWaterDistance;
      vertexData[dataOffset + 18] = bottomLeftWaterDistance;
      vertexData[dataOffset + 19] = bottomRightWaterDistance;
      vertexData[dataOffset + 20] = topMarker;
      vertexData[dataOffset + 21] = rightMarker;
      vertexData[dataOffset + 22] = leftMarker;
      vertexData[dataOffset + 23] = bottomMarker;

      vertexData[dataOffset + 24] = x1;
      vertexData[dataOffset + 25] = y2;
      vertexData[dataOffset + 26] = 0;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = topLeftWaterDistance;
      vertexData[dataOffset + 29] = topRightWaterDistance;
      vertexData[dataOffset + 30] = bottomLeftWaterDistance;
      vertexData[dataOffset + 31] = bottomRightWaterDistance;
      vertexData[dataOffset + 32] = topMarker;
      vertexData[dataOffset + 33] = rightMarker;
      vertexData[dataOffset + 34] = leftMarker;
      vertexData[dataOffset + 35] = bottomMarker;

      vertexData[dataOffset + 36] = x1;
      vertexData[dataOffset + 37] = y2;
      vertexData[dataOffset + 38] = 0;
      vertexData[dataOffset + 39] = 1;
      vertexData[dataOffset + 40] = topLeftWaterDistance;
      vertexData[dataOffset + 41] = topRightWaterDistance;
      vertexData[dataOffset + 42] = bottomLeftWaterDistance;
      vertexData[dataOffset + 43] = bottomRightWaterDistance;
      vertexData[dataOffset + 44] = topMarker;
      vertexData[dataOffset + 45] = rightMarker;
      vertexData[dataOffset + 46] = leftMarker;
      vertexData[dataOffset + 47] = bottomMarker;

      vertexData[dataOffset + 48] = x2;
      vertexData[dataOffset + 49] = y1;
      vertexData[dataOffset + 50] = 1;
      vertexData[dataOffset + 51] = 0;
      vertexData[dataOffset + 52] = topLeftWaterDistance;
      vertexData[dataOffset + 53] = topRightWaterDistance;
      vertexData[dataOffset + 54] = bottomLeftWaterDistance;
      vertexData[dataOffset + 55] = bottomRightWaterDistance;
      vertexData[dataOffset + 56] = topMarker;
      vertexData[dataOffset + 57] = rightMarker;
      vertexData[dataOffset + 58] = leftMarker;
      vertexData[dataOffset + 59] = bottomMarker;

      vertexData[dataOffset + 60] = x2;
      vertexData[dataOffset + 61] = y2;
      vertexData[dataOffset + 62] = 1;
      vertexData[dataOffset + 63] = 1;
      vertexData[dataOffset + 64] = topLeftWaterDistance;
      vertexData[dataOffset + 65] = topRightWaterDistance;
      vertexData[dataOffset + 66] = bottomLeftWaterDistance;
      vertexData[dataOffset + 67] = bottomRightWaterDistance;
      vertexData[dataOffset + 68] = topMarker;
      vertexData[dataOffset + 69] = rightMarker;
      vertexData[dataOffset + 70] = leftMarker;
      vertexData[dataOffset + 71] = bottomMarker;
   }

   return vertexData;
}

const calculateRockVertices = (renderChunkX: number, renderChunkY: number): Array<number> => {
   const vertices = new Array<number>();

   const minChunkX = Math.floor(renderChunkX * RENDER_CHUNK_SIZE / SETTINGS.CHUNK_SIZE);
   const maxChunkX = Math.floor((renderChunkX + 1) * RENDER_CHUNK_SIZE / SETTINGS.CHUNK_SIZE) - 1;
   const minChunkY = Math.floor(renderChunkY * RENDER_CHUNK_SIZE / SETTINGS.CHUNK_SIZE);
   const maxChunkY = Math.floor((renderChunkY + 1) * RENDER_CHUNK_SIZE / SETTINGS.CHUNK_SIZE) - 1;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
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

            const textureIdx = waterRock.size as number;

            vertices.push(
               bottomLeft.x, bottomLeft.y, 0, 0, opacity, textureIdx,
               bottomRight.x, bottomRight.y, 1, 0, opacity, textureIdx,
               topLeft.x, topLeft.y, 0, 1, opacity, textureIdx,
               topLeft.x, topLeft.y, 0, 1, opacity, textureIdx,
               bottomRight.x, bottomRight.y, 1, 0, opacity, textureIdx,
               topRight.x, topRight.y, 1, 1, opacity, textureIdx
            );
         }
      }
   }

   return vertices;
}

const calculateBaseVertexData = (waterTiles: ReadonlyArray<Tile>): Float32Array => {
   const vertexData = new Float32Array(waterTiles.length * 6 * 8);

   for (let i = 0; i < waterTiles.length; i++) {
      const tile = waterTiles[i];
      let x1 = tile.x * SETTINGS.TILE_SIZE;
      let x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
      let y1 = tile.y * SETTINGS.TILE_SIZE;
      let y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

      const topIsWater = 1 - tileIsWaterInt(tile.x, tile.y + 1);
      const topRightIsWater = 1 - tileIsWaterInt(tile.x + 1, tile.y + 1);
      const rightIsWater = 1 - tileIsWaterInt(tile.x + 1, tile.y);
      const bottomRightIsWater = 1 - tileIsWaterInt(tile.x + 1, tile.y - 1);
      const bottomIsWater = 1 - tileIsWaterInt(tile.x, tile.y - 1);
      const bottomLeftIsWater = 1 - tileIsWaterInt(tile.x - 1, tile.y - 1);
      const leftIsWater = 1 - tileIsWaterInt(tile.x - 1, tile.y);
      const topLeftIsWater = 1 - tileIsWaterInt(tile.x - 1, tile.y + 1);

      const bottomLeftLandDistance = 1 - (bottomLeftIsWater || bottomIsWater || leftIsWater);
      const bottomRightLandDistance = 1 - (bottomRightIsWater || bottomIsWater || rightIsWater);
      const topLeftLandDistance = 1 - (topLeftIsWater || topIsWater || leftIsWater);
      const topRightLandDistance = 1 - (topRightIsWater || topIsWater || rightIsWater);

      const dataOffset = i * 6 * 8;
      
      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = topLeftLandDistance;
      vertexData[dataOffset + 5] = topRightLandDistance;
      vertexData[dataOffset + 6] = bottomLeftLandDistance;
      vertexData[dataOffset + 7] = bottomRightLandDistance;

      vertexData[dataOffset + 8] = x2;
      vertexData[dataOffset + 9] = y1;
      vertexData[dataOffset + 10] = 1;
      vertexData[dataOffset + 11] = 0;
      vertexData[dataOffset + 12] = topLeftLandDistance;
      vertexData[dataOffset + 13] = topRightLandDistance;
      vertexData[dataOffset + 14] = bottomLeftLandDistance;
      vertexData[dataOffset + 15] = bottomRightLandDistance;

      vertexData[dataOffset + 16] = x1;
      vertexData[dataOffset + 17] = y2;
      vertexData[dataOffset + 18] = 0;
      vertexData[dataOffset + 19] = 1;
      vertexData[dataOffset + 20] = topLeftLandDistance;
      vertexData[dataOffset + 21] = topRightLandDistance;
      vertexData[dataOffset + 22] = bottomLeftLandDistance;
      vertexData[dataOffset + 23] = bottomRightLandDistance;

      vertexData[dataOffset + 24] = x1;
      vertexData[dataOffset + 25] = y2;
      vertexData[dataOffset + 26] = 0;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = topLeftLandDistance;
      vertexData[dataOffset + 29] = topRightLandDistance;
      vertexData[dataOffset + 30] = bottomLeftLandDistance;
      vertexData[dataOffset + 31] = bottomRightLandDistance;

      vertexData[dataOffset + 32] = x2;
      vertexData[dataOffset + 33] = y1;
      vertexData[dataOffset + 34] = 1;
      vertexData[dataOffset + 35] = 0;
      vertexData[dataOffset + 36] = topLeftLandDistance;
      vertexData[dataOffset + 37] = topRightLandDistance;
      vertexData[dataOffset + 38] = bottomLeftLandDistance;
      vertexData[dataOffset + 39] = bottomRightLandDistance;

      vertexData[dataOffset + 40] = x2;
      vertexData[dataOffset + 41] = y2;
      vertexData[dataOffset + 42] = 1;
      vertexData[dataOffset + 43] = 1;
      vertexData[dataOffset + 44] = topLeftLandDistance;
      vertexData[dataOffset + 45] = topRightLandDistance;
      vertexData[dataOffset + 46] = bottomLeftLandDistance;
      vertexData[dataOffset + 47] = bottomRightLandDistance;
   }

   return vertexData;
}

const calculateFoamVertexData = (steppingStones: ReadonlySet<RiverSteppingStone>): Float32Array => {
   const vertexData = new Float32Array(steppingStones.size * 6 * 7);

   let i = 0;
   for (const steppingStone of steppingStones) {
      const renderSize = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
      
      let x1 = (steppingStone.position.x - renderSize/2 - FOAM_PADDING);
      let x2 = (steppingStone.position.x + renderSize/2 + FOAM_PADDING);
      let y1 = (steppingStone.position.y - renderSize/2 - FOAM_PADDING);
      let y2 = (steppingStone.position.y + renderSize/2 + FOAM_PADDING);

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
      const flowDirection = Board.getRiverFlowDirection(tileX, tileY);

      const offset = Point.fromVectorForm(FOAM_OFFSET, flowDirection);
      topLeft.x -= offset.x;
      topRight.x -= offset.x;
      bottomLeft.x -= offset.x;
      bottomRight.x -= offset.x;
      topLeft.y -= offset.y;
      topRight.y -= offset.y;
      bottomLeft.y -= offset.y;
      bottomRight.y -= offset.y;

      const flowDirectionX = Math.sin(flowDirection - steppingStone.rotation);
      const flowDirectionY = Math.cos(flowDirection - steppingStone.rotation);

      const textureOffset = Math.random();

      const dataOffset = i * 6 * 7;

      vertexData[dataOffset] = bottomLeft.x;
      vertexData[dataOffset + 1] = bottomLeft.y;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = flowDirectionX;
      vertexData[dataOffset + 5] = flowDirectionY;
      vertexData[dataOffset + 6] = textureOffset;

      vertexData[dataOffset + 7] = bottomRight.x;
      vertexData[dataOffset + 8] = bottomRight.y;
      vertexData[dataOffset + 9] = 1;
      vertexData[dataOffset + 10] = 0;
      vertexData[dataOffset + 11] = flowDirectionX;
      vertexData[dataOffset + 12] = flowDirectionY;
      vertexData[dataOffset + 13] = textureOffset;

      vertexData[dataOffset + 14] = topLeft.x;
      vertexData[dataOffset + 15] = topLeft.y;
      vertexData[dataOffset + 16] = 0;
      vertexData[dataOffset + 17] = 1;
      vertexData[dataOffset + 18] = flowDirectionX;
      vertexData[dataOffset + 19] = flowDirectionY;
      vertexData[dataOffset + 20] = textureOffset;

      vertexData[dataOffset + 21] = topLeft.x;
      vertexData[dataOffset + 22] = topLeft.y;
      vertexData[dataOffset + 23] = 0;
      vertexData[dataOffset + 24] = 1;
      vertexData[dataOffset + 25] = flowDirectionX;
      vertexData[dataOffset + 26] = flowDirectionY;
      vertexData[dataOffset + 27] = textureOffset;

      vertexData[dataOffset + 28] = bottomRight.x;
      vertexData[dataOffset + 29] = bottomRight.y;
      vertexData[dataOffset + 30] = 1;
      vertexData[dataOffset + 31] = 0;
      vertexData[dataOffset + 32] = flowDirectionX;
      vertexData[dataOffset + 33] = flowDirectionY;
      vertexData[dataOffset + 34] = textureOffset;

      vertexData[dataOffset + 35] = topRight.x;
      vertexData[dataOffset + 36] = topRight.y;
      vertexData[dataOffset + 37] = 1;
      vertexData[dataOffset + 38] = 1;
      vertexData[dataOffset + 39] = flowDirectionX;
      vertexData[dataOffset + 40] = flowDirectionY;
      vertexData[dataOffset + 41] = textureOffset;

      i++;
   }

   return vertexData;
}

const createBaseVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);

   gl.bindVertexArray(null);

   return vao;
}

const createRockVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   gl.bindVertexArray(null);

   return vao;
}

const createHighlightsVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   gl.bindVertexArray(null);

   return vao;
}

const createNoiseVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);

   gl.bindVertexArray(null);

   return vao;
}

const createTransitionVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(6, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(7, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 9 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(8, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 10 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(9, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);
   gl.enableVertexAttribArray(6);
   gl.enableVertexAttribArray(7);
   gl.enableVertexAttribArray(8);
   gl.enableVertexAttribArray(9);

   gl.bindVertexArray(null);

   return vao;
}

const createFoamVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   gl.bindVertexArray(null);

   return vao;
}

const createSteppingStoneVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   gl.bindVertexArray(null);

   return vao;
}

const getRenderChunkWaterTiles = (renderChunkX: number, renderChunkY: number): ReadonlyArray<Tile> => {
   const minTileX = renderChunkX * RENDER_CHUNK_SIZE;
   const maxTileX = (renderChunkX + 1) * RENDER_CHUNK_SIZE - 1;
   const minTileY = renderChunkY * RENDER_CHUNK_SIZE;
   const maxTileY = (renderChunkY + 1) * RENDER_CHUNK_SIZE - 1;

   const tiles = new Array<Tile>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type === "water") {
            tiles.push(tile);
         }
      }
   }

   return tiles;
}

const renderChunkHasBorderingWaterTiles = (renderChunkX: number, renderChunkY: number): boolean => {
   const leftTileX = renderChunkX * RENDER_CHUNK_SIZE - 1;
   const rightTileX = (renderChunkX + 1) * RENDER_CHUNK_SIZE;
   const topTileY = (renderChunkY + 1) * RENDER_CHUNK_SIZE;
   const bottomTileY = renderChunkY * RENDER_CHUNK_SIZE - 1;

   // Left border tiles
   for (let tileY = bottomTileY; tileY <= topTileY; tileY++) {
      if (Board.tileIsInBoard(leftTileX, tileY)) {
         const tile = Board.getTile(leftTileX, tileY);
         if (tile.type === "water") {
            return true;
         }
      }
   }
   
   // Right border tiles
   for (let tileY = bottomTileY; tileY <= topTileY; tileY++) {
      if (Board.tileIsInBoard(rightTileX, tileY)) {
         const tile = Board.getTile(rightTileX, tileY);
         if (tile.type === "water") {
            return true;
         }
      }
   }

   // Top border tiles
   for (let tileX = leftTileX; tileX <= rightTileX; tileX++) {
      if (Board.tileIsInBoard(tileX, topTileY)) {
         const tile = Board.getTile(tileX, topTileY);
         if (tile.type === "water") {
            return true;
         }
      }
   }

   // Bottom border tiles
   for (let tileX = leftTileX; tileX <= rightTileX; tileX++) {
      if (Board.tileIsInBoard(tileX, bottomTileY)) {
         const tile = Board.getTile(tileX, bottomTileY);
         if (tile.type === "water") {
            return true;
         }
      }
   }

   return false;
}

export function calculateRiverRenderChunkData(renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo | null {
   const waterTiles = getRenderChunkWaterTiles(renderChunkX, renderChunkY);

   // If there are no water tiles don't calculate any data
   // Check for any bordering tiles just outside the render chunk. This is to account for transitions
   // in the current render chunk which happen due to a tile in a different render chunk.
   if (waterTiles.length === 0 && !renderChunkHasBorderingWaterTiles(renderChunkX, renderChunkY)) {
      return null;
   }
   
   const baseVertexData = calculateBaseVertexData(waterTiles);
   const baseBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, baseBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, baseVertexData, gl.STATIC_DRAW);

   const rockVertices = calculateRockVertices(renderChunkX, renderChunkY);
   const rockBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, rockBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rockVertices), gl.STATIC_DRAW);

   const highlightsVertexData = calculateHighlightsVertexData(waterTiles);
   const highlightsBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, highlightsBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, highlightsVertexData, gl.STATIC_DRAW);

   const noiseVertexData = calculateNoiseVertexData(waterTiles);
   const noiseBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, noiseBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, noiseVertexData, gl.STATIC_DRAW);

   const transitionVertexData = calculateTransitionVertexData(renderChunkX, renderChunkY);
   const transitionBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, transitionBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, transitionVertexData, gl.STATIC_DRAW);

   const steppingStones = calculateRenderChunkSteppingStones(renderChunkX, renderChunkY);

   const foamVertexData = calculateFoamVertexData(steppingStones);
   const foamBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, foamBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, foamVertexData, gl.STATIC_DRAW);

   const steppingStoneVertexData = calculateSteppingStoneVertexData(steppingStones);
   const steppingStoneBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, steppingStoneBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, steppingStoneVertexData, gl.STATIC_DRAW);

   return {
      baseVAO: createBaseVAO(baseBuffer),
      baseVertexCount: baseVertexData.length / 8,
      rockVAO: createRockVAO(rockBuffer),
      rockVertexCount: rockVertices.length / 6,
      highlightsVAO: createHighlightsVAO(highlightsBuffer),
      highlightsVertexCount: highlightsVertexData.length / 5,
      transitionVAO: createTransitionVAO(transitionBuffer),
      transitionVertexCount: transitionVertexData.length / 12,
      noiseVAO: createNoiseVAO(noiseBuffer),
      noiseVertexCount: noiseVertexData.length / 8,
      foamVAO: createFoamVAO(foamBuffer),
      foamVertexCount: foamVertexData.length / 7,
      steppingStoneVAO: createSteppingStoneVAO(steppingStoneBuffer),
      steppingStoneVertexCount: steppingStoneVertexData.length / 5
   };
}

const calculateNoiseVertexData = (waterTiles: ReadonlyArray<Tile>): Float32Array => {
   const vertexData = new Float32Array(waterTiles.length * 6 * 8);
   
   for (let i = 0; i < waterTiles.length; i++) {
      const tile = waterTiles[i];
      const flowDirection = Board.getRiverFlowDirection(tile.x, tile.y);
      
      const x1 = (tile.x - 0.5) * SETTINGS.TILE_SIZE;
      const x2 = (tile.x + 1.5) * SETTINGS.TILE_SIZE;
      const y1 = (tile.y - 0.5) * SETTINGS.TILE_SIZE;
      const y2 = (tile.y + 1.5) * SETTINGS.TILE_SIZE;

      const animationOffset = Math.random();
      const animationSpeed = randFloat(1, 1.67);
      
      const flowDirectionX = Math.sin(flowDirection);
      const flowDirectionY = Math.cos(flowDirection);

      const dataOffset = i * 6 * 8;

      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = flowDirectionX;
      vertexData[dataOffset + 5] = flowDirectionY;
      vertexData[dataOffset + 6] = animationOffset;
      vertexData[dataOffset + 7] = animationSpeed;

      vertexData[dataOffset + 8] = x2;
      vertexData[dataOffset + 9] = y1;
      vertexData[dataOffset + 10] = 1;
      vertexData[dataOffset + 11] = 0;
      vertexData[dataOffset + 12] = flowDirectionX;
      vertexData[dataOffset + 13] = flowDirectionY;
      vertexData[dataOffset + 14] = animationOffset;
      vertexData[dataOffset + 15] = animationSpeed;

      vertexData[dataOffset + 16] = x1;
      vertexData[dataOffset + 17] = y2;
      vertexData[dataOffset + 18] = 0;
      vertexData[dataOffset + 19] = 1;
      vertexData[dataOffset + 20] = flowDirectionX;
      vertexData[dataOffset + 21] = flowDirectionY;
      vertexData[dataOffset + 22] = animationOffset;
      vertexData[dataOffset + 23] = animationSpeed;

      vertexData[dataOffset + 24] = x1;
      vertexData[dataOffset + 25] = y2;
      vertexData[dataOffset + 26] = 0;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = flowDirectionX;
      vertexData[dataOffset + 29] = flowDirectionY;
      vertexData[dataOffset + 30] = animationOffset;
      vertexData[dataOffset + 31] = animationSpeed;

      vertexData[dataOffset + 32] = x2;
      vertexData[dataOffset + 33] = y1;
      vertexData[dataOffset + 34] = 1;
      vertexData[dataOffset + 35] = 0;
      vertexData[dataOffset + 36] = flowDirectionX;
      vertexData[dataOffset + 37] = flowDirectionY;
      vertexData[dataOffset + 38] = animationOffset;
      vertexData[dataOffset + 39] = animationSpeed;

      vertexData[dataOffset + 40] = x2;
      vertexData[dataOffset + 41] = y2;
      vertexData[dataOffset + 42] = 1;
      vertexData[dataOffset + 43] = 1;
      vertexData[dataOffset + 44] = flowDirectionX;
      vertexData[dataOffset + 45] = flowDirectionY;
      vertexData[dataOffset + 46] = animationOffset;
      vertexData[dataOffset + 47] = animationSpeed;
   }

   return vertexData;
}

const calculateRenderChunkSteppingStones = (renderChunkX: number, renderChunkY: number): ReadonlySet<RiverSteppingStone> => {
   const steppingStones = new Set<RiverSteppingStone>();

   for (let chunkX = renderChunkX * 2; chunkX <= renderChunkX * 2 + 1; chunkX++) {
      for (let chunkY = renderChunkY * 2; chunkY <= renderChunkY * 2 + 1; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const riverSteppingStone of chunk.riverSteppingStones) {
            steppingStones.add(riverSteppingStone);
         }
      }
   }
   
   return steppingStones;
}

const calculateSteppingStoneVertexData = (visibleSteppingStones: ReadonlySet<RiverSteppingStone>): Float32Array => {
   const vertexData = new Float32Array(visibleSteppingStones.size * 6 * 5);

   let i = 0;
   for (const steppingStone of visibleSteppingStones) {
      const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
      
      let x1 = (steppingStone.position.x - size/2);
      let x2 = (steppingStone.position.x + size/2);
      let y1 = (steppingStone.position.y - size/2);
      let y2 = (steppingStone.position.y + size/2);

      // @Speed: Garbage collection
      let topLeft = new Point(x1, y2);
      let topRight = new Point(x2, y2);
      let bottomRight = new Point(x2, y1);
      let bottomLeft = new Point(x1, y1);

      const pos = new Point(steppingStone.position.x, steppingStone.position.y);

      topLeft = rotatePoint(topLeft, pos, steppingStone.rotation);
      topRight = rotatePoint(topRight, pos, steppingStone.rotation);
      bottomRight = rotatePoint(bottomRight, pos, steppingStone.rotation);
      bottomLeft = rotatePoint(bottomLeft, pos, steppingStone.rotation);

      const textureIdx = steppingStone.size as number;

      const dataOffset = i * 6 * 5;

      vertexData[dataOffset] = bottomLeft.x;
      vertexData[dataOffset + 1] = bottomLeft.y;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = textureIdx;

      vertexData[dataOffset + 5] = bottomRight.x;
      vertexData[dataOffset + 6] = bottomRight.y;
      vertexData[dataOffset + 7] = 1;
      vertexData[dataOffset + 8] = 0;
      vertexData[dataOffset + 9] = textureIdx;

      vertexData[dataOffset + 10] = topLeft.x;
      vertexData[dataOffset + 11] = topLeft.y;
      vertexData[dataOffset + 12] = 0;
      vertexData[dataOffset + 13] = 1;
      vertexData[dataOffset + 14] = textureIdx;

      vertexData[dataOffset + 15] = topLeft.x;
      vertexData[dataOffset + 16] = topLeft.y;
      vertexData[dataOffset + 17] = 0;
      vertexData[dataOffset + 18] = 1;
      vertexData[dataOffset + 19] = textureIdx;

      vertexData[dataOffset + 20] = bottomRight.x;
      vertexData[dataOffset + 21] = bottomRight.y;
      vertexData[dataOffset + 22] = 1;
      vertexData[dataOffset + 23] = 0;
      vertexData[dataOffset + 24] = textureIdx;

      vertexData[dataOffset + 25] = topRight.x;
      vertexData[dataOffset + 26] = topRight.y;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = 1;
      vertexData[dataOffset + 29] = textureIdx;

      i++;
   }

   return vertexData;
}

const calculateHighlightsVertexData = (waterTiles: ReadonlyArray<Tile>): Float32Array => {
   const vertexData = new Float32Array(waterTiles.length * 6 * 5);
   
   for (let i = 0; i < waterTiles.length; i++) {
      const tile = waterTiles[i];
      const x1 = tile.x * SETTINGS.TILE_SIZE;
      const x2 = (tile.x + 1) * SETTINGS.TILE_SIZE;
      const y1 = tile.y * SETTINGS.TILE_SIZE;
      const y2 = (tile.y + 1) * SETTINGS.TILE_SIZE;

      const fadeOffset = Math.random() * 3;

      const dataOffset = i * 6 * 5;

      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = fadeOffset;

      vertexData[dataOffset + 5] = x2;
      vertexData[dataOffset + 6] = y1;
      vertexData[dataOffset + 7] = 1;
      vertexData[dataOffset + 8] = 0;
      vertexData[dataOffset + 9] = fadeOffset;

      vertexData[dataOffset + 10] = x1;
      vertexData[dataOffset + 11] = y2;
      vertexData[dataOffset + 12] = 0;
      vertexData[dataOffset + 13] = 1;
      vertexData[dataOffset + 14] = fadeOffset;

      vertexData[dataOffset + 15] = x1;
      vertexData[dataOffset + 16] = y2;
      vertexData[dataOffset + 17] = 0;
      vertexData[dataOffset + 18] = 1;
      vertexData[dataOffset + 19] = fadeOffset;

      vertexData[dataOffset + 20] = x2;
      vertexData[dataOffset + 21] = y1;
      vertexData[dataOffset + 22] = 1;
      vertexData[dataOffset + 23] = 0;
      vertexData[dataOffset + 24] = fadeOffset;

      vertexData[dataOffset + 25] = x1;
      vertexData[dataOffset + 26] = y2;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = 0;
      vertexData[dataOffset + 29] = fadeOffset;
   }

   return vertexData;
}

const calculateVisibleRenderChunks = (): ReadonlyArray<RenderChunkRiverInfo> => {
   const renderChunks = new Array<RenderChunkRiverInfo>();

   for (let renderChunkX = Camera.visibleRenderChunkBounds[0]; renderChunkX <= Camera.visibleRenderChunkBounds[1]; renderChunkX++) {
      for (let renderChunkY = Camera.visibleRenderChunkBounds[2]; renderChunkY <= Camera.visibleRenderChunkBounds[3]; renderChunkY++) {
         const renderChunkInfo = getRenderChunkRiverInfo(renderChunkX, renderChunkY);
         if (renderChunkInfo !== null) {
            renderChunks.push(renderChunkInfo);
         }
      }
   }

   return renderChunks;
}

export function renderRivers(renderTime: number): void {
   const visibleRenderChunks = calculateVisibleRenderChunks();

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
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.baseVertexCount);
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
      gl.activeTexture(gl.TEXTURE0 + rockSize);
      gl.bindTexture(gl.TEXTURE_2D, texture);
   }

   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkRiverInfo.rockVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.rockVertexCount);
   }

   // 
   // Highlights program
   // 

   gl.useProgram(highlightsProgram);
      
   const highlightsFadeProgress = (renderTime / 3000) % 3;
   gl.uniform1f(highlightsProgramFadeProgressUniformLocation, highlightsFadeProgress);

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
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.highlightsVertexCount);
   }
   
   // 
   // Noise program
   // 
   
   gl.useProgram(noiseProgram);
      
   const noiseAnimationOffset = renderTime * WATER_VISUAL_FLOW_SPEED / 1000;
   gl.uniform1f(noiseAnimationOffsetUniformLocation, noiseAnimationOffset);
               
   const noiseTexture = getTexture("tiles/water-noise.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, noiseTexture);

   for (const renderChunkInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkInfo.noiseVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.noiseVertexCount);
   }

   // 
   // Transition program
   // 

   gl.useProgram(transitionProgram);
      
   // Bind transition texture
   const transitionTexture = getTexture("tiles/gravel.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, transitionTexture);
   const gravelNoiseTexture = getTexture("miscellaneous/gravel-noise-texture.png");
   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D, gravelNoiseTexture);

   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkRiverInfo.transitionVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.transitionVertexCount);
   }
   
   // 
   // Foam program
   // 

   gl.useProgram(foamProgram);

   // Bind foam texture
   const foamTexture = getTexture("tiles/water-foam.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, foamTexture);
   
   const foamTextureOffset = renderTime * WATER_VISUAL_FLOW_SPEED / 1000;
   gl.uniform1f(foamProgramTextureOffsetUniformLocation, foamTextureOffset);

   // Bind stepping stone textures
   for (let size: RiverSteppingStoneSize = 0; size < 3; size++) {
      const textureSource = RIVER_STEPPING_STONE_TEXTURES[size];
      const steppingStoneTexture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE1 + size);
      gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture);
   }

   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkRiverInfo.foamVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.foamVertexCount);
   }
   
   // 
   // Stepping stone program
   // 

   gl.useProgram(steppingStoneProgram);

   const steppingStoneTexture1 = getTexture(RIVER_STEPPING_STONE_TEXTURES[RiverSteppingStoneSize.small]);
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture1);

   const steppingStoneTexture2 = getTexture(RIVER_STEPPING_STONE_TEXTURES[RiverSteppingStoneSize.medium]);
   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture2);

   const steppingStoneTexture3 = getTexture(RIVER_STEPPING_STONE_TEXTURES[RiverSteppingStoneSize.large]);
   gl.activeTexture(gl.TEXTURE2);
   gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture3);
   
   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkRiverInfo.steppingStoneVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.steppingStoneVertexCount);
   }

   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}