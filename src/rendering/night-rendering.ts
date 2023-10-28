import { lerp } from "webgl-test-shared";
import { createWebGLProgram, gl } from "../webgl";
import Board from "../Board";

const vertexShaderText = `#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
const fragmentShaderText = `#version 300 es
precision mediump float;

uniform float u_darkenFactor;

out vec4 outputColour;
 
void main() {
   outputColour = vec4(0.0, 0.0, 0.0, u_darkenFactor);
}
`;

const NIGHT_DARKNESS = 0.6;

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;

let darkenFactorUniformLocation: WebGLUniformLocation;

export function createNightShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   darkenFactorUniformLocation = gl.getUniformLocation(program, "u_darkenFactor")!;

   vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   const vertices = [
      -1, -1,
      1, 1,
      -1, 1,
      -1, -1,
      1, -1,
      1, 1
   ];
   
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.bindVertexArray(null);
}

export function renderNight(): void {
   // Don't render nighttime if it is day
   if (Board.time >= 6 && Board.time < 18) return;

   let darkenFactor: number;
   if (Board.time >= 18 && Board.time < 20) {
      darkenFactor = lerp(0, NIGHT_DARKNESS, (Board.time - 18) / 2);
   } else if (Board.time >= 4 && Board.time < 6) {
      darkenFactor = lerp(0, NIGHT_DARKNESS, (6 - Board.time) / 2);
   } else {
      darkenFactor = NIGHT_DARKNESS;
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   gl.bindVertexArray(vao);

   gl.uniform1f(darkenFactorUniformLocation, darkenFactor);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}