import { DecorationInfo, DecorationType, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import Camera from "../Camera";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import { GAME_OBJECT_TEXTURE_ATLAS, GAME_OBJECT_TEXTURE_ATLAS_SIZE, GAME_OBJECT_TEXTURE_SLOT_INDEXES, getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import { ATLAS_SLOT_SIZE } from "../texture-atlases/texture-atlas-stitching";
import { getRenderChunk } from "./render-chunks";

interface DecorationRenderInfo {
   readonly textureSource: string;
   readonly textureWidth: number;
   readonly textureHeight: number;
}

const DECORATION_RENDER_INFO: Record<DecorationType, DecorationRenderInfo> = {
   [DecorationType.pebble]: {
      textureSource: "decorations/pebble.png",
      textureWidth: 3,
      textureHeight: 3
   },
   [DecorationType.rock]: {
      textureSource: "decorations/rock1.png",
      textureWidth: 4,
      textureHeight: 4
   },
   [DecorationType.sandstoneRock]: {
      textureSource: "decorations/sandstone-rock.png",
      textureWidth: 4,
      textureHeight: 4
   },
   [DecorationType.sandstoneRockBig]: {
      textureSource: "decorations/sandstone-rock-big.png",
      textureWidth: 5,
      textureHeight: 5
   },
   [DecorationType.blackRock]: {
      textureSource: "decorations/rock1.png",
      textureWidth: 4,
      textureHeight: 4
   },
   [DecorationType.snowPile]: {
      textureSource: "decorations/rock1.png",
      textureWidth: 4,
      textureHeight: 4
   },
   [DecorationType.flower1]: {
      textureSource: "decorations/flower1.png",
      textureWidth: 5,
      textureHeight: 5
   },
   [DecorationType.flower2]: {
      textureSource: "decorations/flower2.png",
      textureWidth: 5,
      textureHeight: 5
   },
   [DecorationType.flower3]: {
      textureSource: "decorations/flower3.png",
      textureWidth: 5,
      textureHeight: 5
   },
   [DecorationType.flower4]: {
      textureSource: "decorations/flower4.png",
      textureWidth: 5,
      textureHeight: 5
   },
   
};

let program: WebGLProgram;
let buffer: WebGLBuffer;

export function createDecorationShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_textureIndex;
   layout(location = 3) in vec2 a_textureSize;
   
   out vec2 v_texCoord;
   out float v_textureIndex;
   out vec2 v_textureSize;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureIndex = a_textureIndex;
      v_textureSize = a_textureSize;
   }`;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   uniform sampler2D u_textureAtlas;
   uniform float u_atlasPixelSize;
   uniform float u_atlasSlotSize;
   
   in vec2 v_texCoord;
   in float v_textureIndex;
   in vec2 v_textureSize;
   
   out vec4 outputColour;
   
   void main() {
      // Calculate the coordinates of the top left corner of the texture
      float textureX = mod(v_textureIndex * u_atlasSlotSize, u_atlasPixelSize);
      float textureY = floor(v_textureIndex * u_atlasSlotSize / u_atlasPixelSize) * u_atlasSlotSize;
      
      // @Incomplete: This is very hacky, the - 0.2 and + 0.1 shenanigans are to prevent texture bleeding but it causes tiny bits of the edge of the textures to get cut off.
      float u = (textureX + v_texCoord.x * (v_textureSize.x - 0.2) + 0.1) / u_atlasPixelSize;
      float v = 1.0 - ((textureY + (1.0 - v_texCoord.y) * (v_textureSize.y - 0.2) + 0.1) / u_atlasPixelSize);
      outputColour = texture(u_textureAtlas, vec2(u, v));
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   buffer = gl.createBuffer()!;

   const textureUniformLocation = gl.getUniformLocation(program, "u_textureAtlas")!;
   const atlasPixelSizeUniformLocation = gl.getUniformLocation(program, "u_atlasPixelSize")!;
   const atlasSlotSizeUniformLocation = gl.getUniformLocation(program, "u_atlasSlotSize")!;

   gl.useProgram(program);
   gl.uniform1i(textureUniformLocation, 0);
   gl.uniform1f(atlasPixelSizeUniformLocation, GAME_OBJECT_TEXTURE_ATLAS_SIZE);
   gl.uniform1f(atlasSlotSizeUniformLocation, ATLAS_SLOT_SIZE);
}

export function renderDecorations(): void {
   // Find visible decorations
   const visibleDecorations = new Array<DecorationInfo>();
   for (let renderChunkX = Camera.minVisibleRenderChunkX; renderChunkX <= Camera.maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = Camera.minVisibleRenderChunkY; renderChunkY <= Camera.maxVisibleRenderChunkY; renderChunkY++) {
         const decorations = getRenderChunk(renderChunkX, renderChunkY).decorations;
         for (const decoration of decorations) {
            if (!visibleDecorations.includes(decoration)) {
               visibleDecorations.push(decoration);
            }
         }
      }
   }

   if (visibleDecorations.length === 0) {
      return;
   }

   // Create vertices
   const vertices = new Array<number>();
   for (const decoration of visibleDecorations) {
      const renderInfo = DECORATION_RENDER_INFO[decoration.type];

      const x1 = decoration.positionX - renderInfo.textureWidth * 2;
      const x2 = decoration.positionX + renderInfo.textureWidth * 2;
      const y1 = decoration.positionY - renderInfo.textureHeight * 2;
      const y2 = decoration.positionY + renderInfo.textureHeight * 2;

      // Rotate the render part to match its rotation
      const topLeftX = rotateXAroundPoint(x1, y2, decoration.positionX, decoration.positionY, decoration.rotation);
      const topLeftY = rotateYAroundPoint(x1, y2, decoration.positionX, decoration.positionY, decoration.rotation);
      const topRightX = rotateXAroundPoint(x2, y2, decoration.positionX, decoration.positionY, decoration.rotation);
      const topRightY = rotateYAroundPoint(x2, y2, decoration.positionX, decoration.positionY, decoration.rotation);
      const bottomLeftX = rotateXAroundPoint(x1, y1, decoration.positionX, decoration.positionY, decoration.rotation);
      const bottomLeftY = rotateYAroundPoint(x1, y1, decoration.positionX, decoration.positionY, decoration.rotation);
      const bottomRightX = rotateXAroundPoint(x2, y1, decoration.positionX, decoration.positionY, decoration.rotation);
      const bottomRightY = rotateYAroundPoint(x2, y1, decoration.positionX, decoration.positionY, decoration.rotation);

      const textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(renderInfo.textureSource)];

      vertices.push(
         bottomLeftX, bottomLeftY, 0, 0, textureSlotIndex, renderInfo.textureWidth, renderInfo.textureHeight,
         bottomRightX, bottomRightY, 1, 0, textureSlotIndex, renderInfo.textureWidth, renderInfo.textureHeight,
         topLeftX, topLeftY, 0, 1, textureSlotIndex, renderInfo.textureWidth, renderInfo.textureHeight,
         topLeftX, topLeftY, 0, 1, textureSlotIndex, renderInfo.textureWidth, renderInfo.textureHeight,
         bottomRightX, bottomRightY, 1, 0, textureSlotIndex, renderInfo.textureWidth, renderInfo.textureHeight,
         topRightX, topRightY, 1, 1, textureSlotIndex, renderInfo.textureWidth, renderInfo.textureHeight
      );
   }
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, GAME_OBJECT_TEXTURE_ATLAS);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

   // Enable the attributes
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 7);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}