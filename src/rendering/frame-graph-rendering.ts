import { lerp } from "webgl-test-shared";
import { FrameInfo } from "../components/game/dev/FrameGraph";
import { createWebGLProgram } from "../webgl";

const MAX_FRAME_RENDER_TIME = 20 / 1000;

/** Time that frames are recorded for */
export const FRAME_GRAPH_RECORD_TIME = 1;

const vertexShaderText = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec3 a_colour;

out vec3 v_colour;

void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_colour = a_colour;
}
`;

const fragmentShaderText = `#version 300 es
precision highp float;

in vec3 v_colour;

out vec4 outputColour;

void main() {
   outputColour = vec4(v_colour, 1.0);
}
`;

let gl: WebGL2RenderingContext;

let program: WebGLProgram;

const createGLContext = (): void => {
   const canvas = document.getElementById("frame-graph-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl2");

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
}

const createShaders = (): void => {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
}

export function setupFrameGraph(): void {
   createGLContext();
   createShaders();
}

export function renderFrameGraph(renderTime: number, frames: ReadonlyArray<FrameInfo>): void {
   const vertexData = new Float32Array(frames.length * 6 * 5);
   
   const currentTimeSeconds = renderTime / 1000;
   
   // Calculate vertices
   for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const secondsSinceFrameStartTime = currentTimeSeconds - frame.startTime / 1000;
      const secondsSinceFrameEndTime = currentTimeSeconds - frame.endTime / 1000;

      const frameRenderTime = secondsSinceFrameStartTime - secondsSinceFrameEndTime;
      const percentageHeight = frameRenderTime / MAX_FRAME_RENDER_TIME;

      const x1 = lerp(-1, 1, secondsSinceFrameEndTime / FRAME_GRAPH_RECORD_TIME);
      const x2 = lerp(-1, 1, secondsSinceFrameStartTime / FRAME_GRAPH_RECORD_TIME);
      const y1 = -1;
      const y2 = lerp(-1, 1, percentageHeight);

      const r = 1;
      const g = 0;
      const b = 0;

      vertexData[i * 6 * 5] = x1;
      vertexData[i * 6 * 5 + 1] = y1;
      vertexData[i * 6 * 5 + 2] = r;
      vertexData[i * 6 * 5 + 3] = g;
      vertexData[i * 6 * 5 + 4] = b;

      vertexData[i * 6 * 5 + 5] = x2;
      vertexData[i * 6 * 5 + 6] = y1;
      vertexData[i * 6 * 5 + 7] = r;
      vertexData[i * 6 * 5 + 8] = g;
      vertexData[i * 6 * 5 + 9] = b;

      vertexData[i * 6 * 5 + 10] = x1;
      vertexData[i * 6 * 5 + 11] = y2;
      vertexData[i * 6 * 5 + 12] = r;
      vertexData[i * 6 * 5 + 13] = g;
      vertexData[i * 6 * 5 + 14] = b;

      vertexData[i * 6 * 5 + 15] = x1;
      vertexData[i * 6 * 5 + 16] = y2;
      vertexData[i * 6 * 5 + 17] = r;
      vertexData[i * 6 * 5 + 18] = g;
      vertexData[i * 6 * 5 + 19] = b;

      vertexData[i * 6 * 5 + 20] = x2;
      vertexData[i * 6 * 5 + 21] = y1;
      vertexData[i * 6 * 5 + 22] = r;
      vertexData[i * 6 * 5 + 23] = g;
      vertexData[i * 6 * 5 + 24] = b;

      vertexData[i * 6 * 5 + 25] = x2;
      vertexData[i * 6 * 5 + 26] = y2;
      vertexData[i * 6 * 5 + 27] = r;
      vertexData[i * 6 * 5 + 28] = g;
      vertexData[i * 6 * 5 + 29] = b;
   }
   
   gl.useProgram(program);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, frames.length * 6);
}