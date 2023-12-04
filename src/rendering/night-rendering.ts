import { SETTINGS, lerp } from "webgl-test-shared";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import Board from "../Board";

const NIGHT_DARKNESS = 0.6;

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;

let darkenFactorUniformLocation: WebGLUniformLocation;

export function createNightShaders(): void {
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
      gl_Position = vec4(a_position, 0.0, 1.0);
   
      // Calculate and pass on game position
      vec2 screenPos1 = (a_position + 1.0) * u_halfWindowSize;
      v_position = (screenPos1 - u_halfWindowSize) / u_zoom + u_playerPos;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define MAX_LIGHTS 128
   #define TILE_SIZE ${SETTINGS.TILE_SIZE.toFixed(1)}
   
   uniform int u_numLights;
   uniform vec2 u_lightPositions[MAX_LIGHTS];
   uniform float u_lightStrengths[MAX_LIGHTS];
   uniform float u_lightRadii[MAX_LIGHTS];
   
   uniform float u_darkenFactor;
   
   in vec2 v_position;
   
   out vec4 outputColour;

   float roundPixel(float num) {
      return ceil(num / 4.0) * 4.0;
   }
    
   void main() {
      // float x = roundPixel(v_position.x);
      // float y = roundPixel(v_position.y);
      
      float totalLightIntensity = 0.0;
      for (int i = 0; i < u_numLights; i++) {
         vec2 lightPos = u_lightPositions[i];
         float strength = u_lightStrengths[i] * TILE_SIZE;
         float radius = u_lightRadii[i];

         float dist = distance(v_position, lightPos);
         dist -= radius;
         if (dist < 0.0) {
            dist = 0.0;
         }

         float intensity = 1.0 - dist / strength;
         if (intensity > 0.0) {
            intensity = pow(intensity, 2.0);
            totalLightIntensity += intensity;
         }
      }

      if (totalLightIntensity > 1.0) {
         totalLightIntensity = 1.0;
      }
      // totalLightIntensity = roundPixel(totalLightIntensity);
      
      float darkness = mix(u_darkenFactor, 0.0, totalLightIntensity);
      outputColour = vec4(0.0, 0.0, 0.0, darkness);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

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

   const lightPositions = new Array<number>();
   const lightStrengths = new Array<number>();
   const lightRadii = new Array<number>();
   for (const light of Board.lights) {
      lightPositions.push(light.position.x);
      lightPositions.push(light.position.y);
      lightStrengths.push(light.strength);
      lightRadii.push(light.radius);
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   gl.bindVertexArray(vao);

   gl.uniform1f(darkenFactorUniformLocation, darkenFactor);

   const numLightsLocation = gl.getUniformLocation(program, "u_numLights")!;
   gl.uniform1i(numLightsLocation, Board.lights.length);
   if (Board.lights.length > 0) {
      const lightPosLocation = gl.getUniformLocation(program, "u_lightPositions")!;
      gl.uniform2fv(lightPosLocation, new Float32Array(lightPositions));
      const lightStrengthLocation = gl.getUniformLocation(program, "u_lightStrengths")!;
      gl.uniform1fv(lightStrengthLocation, new Float32Array(lightStrengths));
      const lightRadiiLocation = gl.getUniformLocation(program, "u_lightRadii")!;
      gl.uniform1fv(lightRadiiLocation, new Float32Array(lightRadii));
   }

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}