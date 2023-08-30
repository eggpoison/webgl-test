import { lerp } from "webgl-test-shared";
import { FrameInfo } from "../components/game/dev/FrameGraph";
import { createWebGLProgram } from "../webgl";

const MAX_FRAME_RENDER_TIME = 20 / 1000;

/** Time that frames are recorded for */
export const FRAME_GRAPH_RECORD_TIME = 1;

const vertexShaderText = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
in vec3 a_colour;

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

let colourAttribLocation: GLint;

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

   colourAttribLocation = gl.getAttribLocation(program, "a_colour");
}

export function setupFrameGraph(): void {
   createGLContext();
   createShaders();
}

export function renderFrameGraph(frames: ReadonlyArray<FrameInfo>): void {
   // Calculate vertices
   const vertices = new Array<number>();

   const currentTimeSeconds = performance.now() / 1000;
   
   for (const frame of frames) {
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

      vertices.push(
         x1, y1, r, g, b,
         x2, y1, r, g, b,
         x1, y2, r, g, b,
         x1, y2, r, g, b,
         x2, y1, r, g, b,
         x2, y2, r, g, b
      );
   }
   
   gl.useProgram(program);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(colourAttribLocation, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(colourAttribLocation);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);
}