import { rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import Camera from "../Camera";
import { createWebGLProgram, gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import GameObject from "../GameObject";
import Board from "../Board";
import { ATLAS_SLOT_SIZE, GAME_OBJECT_TEXTURE_ATLAS, getAtlasPixelSize, getAtlasTextureHeight, getAtlasTextureIndex, getAtlasTextureWidth } from "../texture-atlas-stitching";

const vertexShaderText = `#version 300 es
precision highp float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

layout(location = 0) in vec2 a_position;
layout(location = 1) in float a_depth;
layout(location = 2) in vec2 a_texCoord;
layout(location = 3) in float a_textureIndex;
layout(location = 4) in vec2 a_textureSize;
layout(location = 5) in vec3 a_tint;
layout(location = 6) in float a_opacity;

out vec2 v_texCoord;
out float v_textureIndex;
out vec2 v_textureSize;
out vec3 v_tint;
out float v_opacity;
 
void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, a_depth, 1.0);

   v_texCoord = a_texCoord;
   v_textureIndex = a_textureIndex;
   v_textureSize = a_textureSize;
   v_tint = a_tint;
   v_opacity = a_opacity;
}
`;

const fragmentShaderText = `#version 300 es
precision highp float;

uniform sampler2D u_textureAtlas;
uniform float u_atlasPixelSize;
uniform float u_atlasSlotSize;

in vec2 v_texCoord;
in float v_textureIndex;
in vec2 v_textureSize;
in vec3 v_tint;
in float v_opacity;

out vec4 outputColour;

void main() {
   float textureX = mod(v_textureIndex * u_atlasSlotSize, u_atlasPixelSize);
   float textureY = floor(v_textureIndex * u_atlasSlotSize / u_atlasPixelSize) * u_atlasSlotSize;
   
   float u = (textureX + v_texCoord.x * v_textureSize.x) / u_atlasPixelSize;
   float v = 1.0 - ((textureY + (1.0 - v_texCoord.y) * v_textureSize.y) / u_atlasPixelSize);
   outputColour = texture(u_textureAtlas, vec2(u, v));
   
   if (v_tint.r > 0.0) {
      outputColour.r = mix(outputColour.r, 1.0, v_tint.r);
   } else {
      outputColour.r = mix(outputColour.r, 0.0, -v_tint.r);
   }
   if (v_tint.g > 0.0) {
      outputColour.g = mix(outputColour.g, 1.0, v_tint.g);
   } else {
      outputColour.g = mix(outputColour.g, 0.0, -v_tint.g);
   }
   if (v_tint.b > 0.0) {
      outputColour.b = mix(outputColour.b, 1.0, v_tint.b);
   } else {
      outputColour.b = mix(outputColour.b, 0.0, -v_tint.b);
   }

   outputColour.a *= v_opacity;
}
`;

let program: WebGLProgram;

let playerPositionUniformLocation: WebGLUniformLocation;
let halfWindowSizeUniformLocation: WebGLUniformLocation;
let zoomUniformLocation: WebGLUniformLocation;
let textureUniformLocation: WebGLUniformLocation;
let atlasPixelSizeUniformLocation: WebGLUniformLocation;
let atlasSlotSizeUniformLocation: WebGLUniformLocation;

export function createEntityShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   playerPositionUniformLocation = gl.getUniformLocation(program, "u_playerPos")!;
   halfWindowSizeUniformLocation = gl.getUniformLocation(program, "u_halfWindowSize")!;
   zoomUniformLocation = gl.getUniformLocation(program, "u_zoom")!;
   textureUniformLocation = gl.getUniformLocation(program, "u_textureAtlas")!;
   atlasPixelSizeUniformLocation = gl.getUniformLocation(program, "u_atlasPixelSize")!;
   atlasSlotSizeUniformLocation = gl.getUniformLocation(program, "u_atlasSlotSize")!;
}

export function calculateVisibleGameObjects(): Array<GameObject> {
   const visibleGameObjects = new Array<GameObject>();

   for (const gameObject of Object.values(Board.gameObjects)) {
      visibleGameObjects.push(gameObject);
   }

   return visibleGameObjects;
}

export function renderGameObjects(): void {
   if (Board.sortedGameObjects.length === 0) return;

   const vertexData = new Float32Array(Board.numVisibleRenderParts * 6 * 12);

   let i = 0;
   for (const gameObject of Board.sortedGameObjects) {
      gameObject.updateRenderPosition();

      for (const renderPart of gameObject.allRenderParts) {
         renderPart.update();

         const depth = -renderPart.zIndex * 0.0001 + gameObject.renderWeight;
   
         const u0 = renderPart.flipX ? 1 : 0;
         const u1 = 1 - u0;

         const x1 = renderPart.renderPosition.x - renderPart.width / 2;
         const x2 = renderPart.renderPosition.x + renderPart.width / 2;
         const y1 = renderPart.renderPosition.y - renderPart.height / 2;
         const y2 = renderPart.renderPosition.y + renderPart.height / 2;

         // Rotate the render part to match its rotation
         const topLeftX = rotateXAroundPoint(x1, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation + renderPart.rotation);
         const topLeftY = rotateYAroundPoint(x1, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation + renderPart.rotation);
         const topRightX = rotateXAroundPoint(x2, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation + renderPart.rotation);
         const topRightY = rotateYAroundPoint(x2, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation + renderPart.rotation);
         const bottomLeftX = rotateXAroundPoint(x1, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation + renderPart.rotation);
         const bottomLeftY = rotateYAroundPoint(x1, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation + renderPart.rotation);
         const bottomRightX = rotateXAroundPoint(x2, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation + renderPart.rotation);
         const bottomRightY = rotateYAroundPoint(x2, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation + renderPart.rotation);

         const textureIndex = getAtlasTextureIndex(renderPart.textureSource);
         const textureWidth = getAtlasTextureWidth(renderPart.textureSource);
         const textureHeight = getAtlasTextureHeight(renderPart.textureSource);

         const dataOffset = i * 6 * 12;

         vertexData[dataOffset] = bottomLeftX;
         vertexData[dataOffset + 1] = bottomLeftY;
         vertexData[dataOffset + 2] = depth;
         vertexData[dataOffset + 3] = u0;
         vertexData[dataOffset + 4] = 0;
         vertexData[dataOffset + 5] = textureIndex;
         vertexData[dataOffset + 6] = textureWidth;
         vertexData[dataOffset + 7] = textureHeight;
         vertexData[dataOffset + 8] = gameObject.tintR;
         vertexData[dataOffset + 9] = gameObject.tintG;
         vertexData[dataOffset + 10] = gameObject.tintB;
         vertexData[dataOffset + 11] = renderPart.opacity;

         vertexData[dataOffset + 12] = bottomRightX;
         vertexData[dataOffset + 13] = bottomRightY;
         vertexData[dataOffset + 14] = depth;
         vertexData[dataOffset + 15] = u1;
         vertexData[dataOffset + 16] = 0;
         vertexData[dataOffset + 17] = textureIndex;
         vertexData[dataOffset + 18] = textureWidth;
         vertexData[dataOffset + 19] = textureHeight;
         vertexData[dataOffset + 20] = gameObject.tintR;
         vertexData[dataOffset + 21] = gameObject.tintG;
         vertexData[dataOffset + 22] = gameObject.tintB;
         vertexData[dataOffset + 23] = renderPart.opacity;

         vertexData[dataOffset + 24] = topLeftX;
         vertexData[dataOffset + 25] = topLeftY;
         vertexData[dataOffset + 26] = depth;
         vertexData[dataOffset + 27] = u0;
         vertexData[dataOffset + 28] = 1;
         vertexData[dataOffset + 29] = textureIndex;
         vertexData[dataOffset + 30] = textureWidth;
         vertexData[dataOffset + 31] = textureHeight;
         vertexData[dataOffset + 32] = gameObject.tintR;
         vertexData[dataOffset + 33] = gameObject.tintG;
         vertexData[dataOffset + 34] = gameObject.tintB;
         vertexData[dataOffset + 35] = renderPart.opacity;

         vertexData[dataOffset + 36] = topLeftX;
         vertexData[dataOffset + 37] = topLeftY;
         vertexData[dataOffset + 38] = depth;
         vertexData[dataOffset + 39] = u0;
         vertexData[dataOffset + 40] = 1;
         vertexData[dataOffset + 41] = textureIndex;
         vertexData[dataOffset + 42] = textureWidth;
         vertexData[dataOffset + 43] = textureHeight;
         vertexData[dataOffset + 44] = gameObject.tintR;
         vertexData[dataOffset + 45] = gameObject.tintG;
         vertexData[dataOffset + 46] = gameObject.tintB;
         vertexData[dataOffset + 47] = renderPart.opacity;

         vertexData[dataOffset + 48] = bottomRightX;
         vertexData[dataOffset + 49] = bottomRightY;
         vertexData[dataOffset + 50] = depth;
         vertexData[dataOffset + 51] = u1;
         vertexData[dataOffset + 52] = 0;
         vertexData[dataOffset + 53] = textureIndex;
         vertexData[dataOffset + 54] = textureWidth;
         vertexData[dataOffset + 55] = textureHeight;
         vertexData[dataOffset + 56] = gameObject.tintR;
         vertexData[dataOffset + 57] = gameObject.tintG;
         vertexData[dataOffset + 58] = gameObject.tintB;
         vertexData[dataOffset + 59] = renderPart.opacity;

         vertexData[dataOffset + 60] = topRightX;
         vertexData[dataOffset + 61] = topRightY;
         vertexData[dataOffset + 62] = depth;
         vertexData[dataOffset + 63] = u1;
         vertexData[dataOffset + 64] = 1;
         vertexData[dataOffset + 65] = textureIndex;
         vertexData[dataOffset + 66] = textureWidth;
         vertexData[dataOffset + 67] = textureHeight;
         vertexData[dataOffset + 68] = gameObject.tintR;
         vertexData[dataOffset + 69] = gameObject.tintG;
         vertexData[dataOffset + 70] = gameObject.tintB;
         vertexData[dataOffset + 71] = renderPart.opacity;

         i++;
      }
   }

   if (i !== Board.numVisibleRenderParts) {
      throw new Error("Was missing or had extra render parts");
   }

   gl.useProgram(program);

   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(true);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, GAME_OBJECT_TEXTURE_ATLAS);

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 3, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(6, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);
   gl.enableVertexAttribArray(6);

   gl.uniform2f(playerPositionUniformLocation, Camera.position.x, Camera.position.y);
   gl.uniform2f(halfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
   gl.uniform1f(zoomUniformLocation, Camera.zoom);
   gl.uniform1i(textureUniformLocation, 0);
   gl.uniform1f(atlasPixelSizeUniformLocation, getAtlasPixelSize());
   gl.uniform1f(atlasSlotSizeUniformLocation, ATLAS_SLOT_SIZE);
   
   gl.drawArrays(gl.TRIANGLES, 0, Board.numVisibleRenderParts * 6);

   gl.disable(gl.DEPTH_TEST);
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
   gl.depthMask(false);
}