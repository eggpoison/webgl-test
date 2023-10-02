import { lerp, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import Camera from "../Camera";
import { createWebGLProgram, gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import GameObject from "../GameObject";
import Board from "../Board";
import Entity from "../entities/Entity";
import { ATLAS_SLOT_SIZE, GAME_OBJECT_TEXTURE_ATLAS, getAtlasPixelSize, getAtlasTextureHeight, getAtlasTextureIndex, getAtlasTextureWidth } from "../texture-atlas-stitching";

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

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
   // float t = 15.0 * 4.0 + 4.0;
   // float textureX = mod(t * u_atlasSlotSize, u_atlasPixelSize);
   // float textureY = floor(t * u_atlasSlotSize / u_atlasPixelSize) * u_atlasSlotSize;
   
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

   const vertices = new Array<number>();

   let last = 1;
   for (const gameObject of Board.sortedGameObjects) {
      if (gameObject.renderWeight > last) {
         throw new Error();
      }
      last = gameObject.renderWeight;
      gameObject.updateRenderPosition();

      for (const renderPart of gameObject.allRenderParts) {
         renderPart.update();

         const depth = -renderPart.zIndex * 0.0001 + gameObject.renderWeight;

         let redTint = 0;
         let greenTint = 0;
         let blueTint = 0;

         // @Cleanup: This shouldn't be here, and shouldn't be hardcoded
         if (gameObject instanceof Entity) {
            if (gameObject.hasStatusEffect("freezing")) {
               blueTint += 0.5;
               redTint -= 0.15;
            }

            let redness: number;
            if (gameObject.secondsSinceLastHit === null || gameObject.secondsSinceLastHit > ATTACK_HIT_FLASH_DURATION) {
               redness = 0;
            } else {
               redness = MAX_REDNESS * (1 - gameObject.secondsSinceLastHit / ATTACK_HIT_FLASH_DURATION);
            }

            redTint = lerp(redTint, 1, redness);
            greenTint = lerp(greenTint, -1, redness);
            blueTint = lerp(blueTint, -1, redness);
         }
   
         const u0 = renderPart.flipX ? 1 : 0;
         const u1 = 1 - u0;

         const x1 = renderPart.renderPosition.x - renderPart.width / 2;
         const x2 = renderPart.renderPosition.x + renderPart.width / 2;
         const y1 = renderPart.renderPosition.y - renderPart.height / 2;
         const y2 = renderPart.renderPosition.y + renderPart.height / 2;

         // Rotate the render part to match its rotation
         // @Temporary @Incomplete: Changed from totalRotation to render part rotation
         const topLeftX = rotateXAroundPoint(x1, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation);
         const topLeftY = rotateYAroundPoint(x1, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation);
         const topRightX = rotateXAroundPoint(x2, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation);
         const topRightY = rotateYAroundPoint(x2, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation);
         const bottomLeftX = rotateXAroundPoint(x1, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation);
         const bottomLeftY = rotateYAroundPoint(x1, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation);
         const bottomRightX = rotateXAroundPoint(x2, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation);
         const bottomRightY = rotateYAroundPoint(x2, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalRotation);

         const textureIndex = getAtlasTextureIndex(renderPart.textureSource);
         const textureWidth = getAtlasTextureWidth(renderPart.textureSource);
         const textureHeight = getAtlasTextureHeight(renderPart.textureSource);
         
         vertices.push(
            bottomLeftX, bottomLeftY, depth, u0, 0, textureIndex, textureWidth, textureHeight, redTint, greenTint, blueTint, renderPart.opacity,
            bottomRightX, bottomRightY, depth, u1, 0, textureIndex, textureWidth, textureHeight, redTint, greenTint, blueTint, renderPart.opacity,
            topLeftX, topLeftY, depth, u0, 1, textureIndex, textureWidth, textureHeight, redTint, greenTint, blueTint, renderPart.opacity,
            topLeftX, topLeftY, depth, u0, 1, textureIndex, textureWidth, textureHeight, redTint, greenTint, blueTint, renderPart.opacity,
            bottomRightX, bottomRightY, depth, u1, 0, textureIndex, textureWidth, textureHeight, redTint, greenTint, blueTint, renderPart.opacity,
            topRightX, topRightY, depth, u1, 1, textureIndex, textureWidth, textureHeight, redTint, greenTint, blueTint, renderPart.opacity
         );
      }
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
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

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
   
   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 12);

   gl.disable(gl.DEPTH_TEST);
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
   gl.depthMask(false);
}