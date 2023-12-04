import { SETTINGS } from "webgl-test-shared";
import Camera from "../Camera";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, TIME_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import { WORLD_RENDER_CHUNK_SIZE } from "./render-chunks";

let program: WebGLProgram;

export function createForcefieldShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   
   out vec2 v_position;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_position = a_position;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;
   
   #define INTERVAL 64.0
   #define PIXEL_SIZE 4.0
   
   layout(std140) uniform Time {
      uniform float u_time;
   };
   
   in vec2 v_position;
   
   out vec4 outputColour;
   
   float roundPixel(float num) {
      return ceil(num / PIXEL_SIZE) * PIXEL_SIZE;
   }
    
   void main() {
      float time_offset = u_time / 80.0;
      
      float x = roundPixel(v_position.x - time_offset);
      float y = roundPixel(v_position.y - time_offset);
      
      float remainder = fract((x + y) / INTERVAL);
      if (remainder < 0.35) {
         float progress = remainder / 0.35;
         progress = mix(0.7, 1.0, progress);
         outputColour = vec4(3.0/255.0 * progress, 190.0/255.0 * progress, 252.0/255.0 * progress, 1.0);
      } else {
         outputColour = vec4(0.0, 0.0, 0.0, 0.0);
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const texturedTimeBlockIndex = gl.getUniformBlockIndex(program, "Time");
   gl.uniformBlockBinding(program, texturedTimeBlockIndex, TIME_UNIFORM_BUFFER_BINDING_INDEX);
}

export function renderForcefield(): void {
   const vertices = new Array<number>();

   // Left forcefield segment
   if (Camera.absoluteMinVisibleRenderChunkX < 0) {
      const x1 = -SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;
      const x2 = 0;
      const y1 = 0;
      const y2 = SETTINGS.BOARD_UNITS;

      vertices.push(
         x1, y1,
         x2, y1,
         x1, y2,
         x1, y2,
         x2, y1,
         x2, y2
      );
   }

   // Right forcefield segment
   if (Camera.absoluteMaxVisibleRenderChunkX >= WORLD_RENDER_CHUNK_SIZE) {
      const x1 = SETTINGS.BOARD_UNITS;
      const x2 = SETTINGS.BOARD_UNITS + SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;
      const y1 = 0;
      const y2 = SETTINGS.BOARD_UNITS;

      vertices.push(
         x1, y1,
         x2, y1,
         x1, y2,
         x1, y2,
         x2, y1,
         x2, y2
      );
   }

   // Bottom forcefield segment
   if (Camera.absoluteMinVisibleRenderChunkY < 0) {
      const x1 = 0;
      const x2 = SETTINGS.BOARD_UNITS;
      const y1 = -SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;
      const y2 = 0;

      vertices.push(
         x1, y1,
         x2, y1,
         x1, y2,
         x1, y2,
         x2, y1,
         x2, y2
      );
   }

   // Top forcefield segment
   if (Camera.absoluteMaxVisibleRenderChunkY >= WORLD_RENDER_CHUNK_SIZE) {
      const x1 = 0;
      const x2 = SETTINGS.BOARD_UNITS;
      const y1 = SETTINGS.BOARD_UNITS;
      const y2 = SETTINGS.BOARD_UNITS + SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;

      vertices.push(
         x1, y1,
         x2, y1,
         x1, y2,
         x1, y2,
         x2, y1,
         x2, y2
      );
   }

   // Bottom left forcefield segment
   if (Camera.absoluteMinVisibleRenderChunkY < 0 && Camera.absoluteMinVisibleRenderChunkX < 0) {
      const x1 = -SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;
      const x2 = 0;
      const y1 = -SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;
      const y2 = 0;

      vertices.push(
         x1, y1,
         x2, y1,
         x1, y2,
         x1, y2,
         x2, y1,
         x2, y2
      );
   }

   // Top left forcefield segment
   if (Camera.absoluteMaxVisibleRenderChunkY >= WORLD_RENDER_CHUNK_SIZE && Camera.absoluteMinVisibleRenderChunkX < 0) {
      const x1 = -SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;
      const x2 = 0;
      const y1 = SETTINGS.BOARD_UNITS;
      const y2 = SETTINGS.BOARD_UNITS + SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;

      vertices.push(
         x1, y1,
         x2, y1,
         x1, y2,
         x1, y2,
         x2, y1,
         x2, y2
      );
   }

   // Bottom right forcefield segment
   if (Camera.absoluteMinVisibleRenderChunkY < 0 && Camera.absoluteMaxVisibleRenderChunkX >= WORLD_RENDER_CHUNK_SIZE) {
      const x1 = SETTINGS.BOARD_UNITS;
      const x2 = SETTINGS.BOARD_UNITS + SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;
      const y1 = -SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;
      const y2 = 0;

      vertices.push(
         x1, y1,
         x2, y1,
         x1, y2,
         x1, y2,
         x2, y1,
         x2, y2
      );
   }

   // Top right forcefield segment
   if (Camera.absoluteMaxVisibleRenderChunkY >= WORLD_RENDER_CHUNK_SIZE && Camera.absoluteMaxVisibleRenderChunkX >= WORLD_RENDER_CHUNK_SIZE) {
      const x1 = SETTINGS.BOARD_UNITS;
      const x2 = SETTINGS.BOARD_UNITS + SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;
      const y1 = SETTINGS.BOARD_UNITS;
      const y2 = SETTINGS.BOARD_UNITS + SETTINGS.EDGE_GENERATION_DISTANCE * SETTINGS.TILE_SIZE;

      vertices.push(
         x1, y1,
         x2, y1,
         x1, y2,
         x1, y2,
         x2, y1,
         x2, y2
      );
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}