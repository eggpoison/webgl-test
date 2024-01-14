import { SETTINGS, lerp } from "webgl-test-shared";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import Board from "../Board";

const NIGHT_LIGHT = 0.4;

let colourProgram: WebGLProgram;
let darknessProgram: WebGLProgram;
let vao: WebGLVertexArrayObject;

let darkenFactorUniformLocation: WebGLUniformLocation;

export function createNightShaders(): void {
   const colourVertexShaderText = `#version 300 es
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
   const colourFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define MAX_LIGHTS 128
   #define TILE_SIZE ${SETTINGS.TILE_SIZE.toFixed(1)}
   
   uniform int u_numLights;
   uniform vec2 u_lightPositions[MAX_LIGHTS];
   uniform float u_lightIntensities[MAX_LIGHTS];
   uniform float u_lightStrengths[MAX_LIGHTS];
   uniform float u_lightRadii[MAX_LIGHTS];
   uniform vec3 u_lightColours[MAX_LIGHTS];
   
   // uniform float u_darkenFactor;
   
   in vec2 v_position;
   
   out vec4 outputColour;
    
   void main() {
      float r = 0.0;
      float g = 0.0;
      float b = 0.0;
      float totalLightIntensity = 0.0;
      for (int i = 0; i < u_numLights; i++) {
         vec2 lightPos = u_lightPositions[i];
         float intensity = u_lightIntensities[i];
         float strength = u_lightStrengths[i] * TILE_SIZE;
         float radius = u_lightRadii[i];
         vec3 colour = u_lightColours[i];

         float dist = distance(v_position, lightPos);
         dist -= radius;
         if (dist < 0.0) {
            dist = 0.0;
         }

         float sampleIntensity = (1.0 - dist / strength) * intensity;
         if (sampleIntensity > 0.0) {
            float intensitySquared = sampleIntensity * sampleIntensity;
            totalLightIntensity += intensitySquared;

            r += colour.r * intensitySquared;
            g += colour.g * intensitySquared;
            b += colour.b * intensitySquared;
         }
      }

      // if (totalLightIntensity > 1.0) {
      //    totalLightIntensity = 1.0;
      // }

      // if (r > 1.0) {
      //    r = 1.0;
      // }
      // if (g > 1.0) {
      //    g = 1.0;
      // }
      // if (b > 1.0) {
      //    b = 1.0;
      // }

      // r = mix(u_darkenFactor, 1.0, r);
      // g = mix(u_darkenFactor, 1.0, g);
      // b = mix(u_darkenFactor, 1.0, b);
      // r += u_darkenFactor;
      // g += u_darkenFactor;
      // b += u_darkenFactor;

      float maxColour = r;
      if (g > maxColour) {
         maxColour = g;
      }
      if (b > maxColour) {
         maxColour = b;
      }
      if (maxColour > 1.0) {
         // r /= maxColour;
         // g /= maxColour;
         // b /= maxColour;
      }

      // outputColour = vec4(r, g, b, 1.0);
      outputColour = vec4(r, g, b, totalLightIntensity);
      // outputColour = vec4(0.0, 0.0, 0.0, totalLightIntensity);
      // outputColour = vec4(0.0, 0.0, 0.0, 0.3);
      
      // float darkness = mix(u_darkenFactor, 0.0, totalLightIntensity);
      // outputColour = vec4(r, g, b, darkness);

      // float opacity = mix(u_darkenFactor, 1.0, totalLightIntensity);
      // outputColour = vec4(r, g, b, opacity);

      // float opacity = mix(u_darkenFactor, 1.0, totalLightIntensity);
      
      // outputColour = vec4(1.0, 1.0, 1.0, 1.0);

      // col + (1.0 - col) * rTint
   }
   `;

   const darknessVertexShaderText = `#version 300 es
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
   const darknessFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define MAX_LIGHTS 128
   #define TILE_SIZE ${SETTINGS.TILE_SIZE.toFixed(1)}
   
   uniform int u_numLights;
   uniform vec2 u_lightPositions[MAX_LIGHTS];
   uniform float u_lightIntensities[MAX_LIGHTS];
   uniform float u_lightStrengths[MAX_LIGHTS];
   uniform float u_lightRadii[MAX_LIGHTS];
   
   uniform float u_darkenFactor;
   
   in vec2 v_position;
   
   out vec4 outputColour;
    
   void main() {
      float totalLightIntensity = 0.0;
      for (int i = 0; i < u_numLights; i++) {
         vec2 lightPos = u_lightPositions[i];
         float intensity = u_lightIntensities[i];
         float strength = u_lightStrengths[i] * TILE_SIZE;
         float radius = u_lightRadii[i];

         float dist = distance(v_position, lightPos);
         dist -= radius;
         if (dist < 0.0) {
            dist = 0.0;
         }

         // float sampleIntensity = (1.0 - dist / strength) * intensity;
         float sampleIntensity = (1.0 - dist / strength);
         if (sampleIntensity > 0.0) {
            float intensitySquared = sampleIntensity * sampleIntensity;
            totalLightIntensity += intensitySquared;
         }
      }

      totalLightIntensity += u_darkenFactor;

      // if (totalLightIntensity > 1.0) {
      //    totalLightIntensity = 1.0;
      // }
      float darkness = 1.0 - totalLightIntensity;
      outputColour = vec4(0.0, 0.0, 0.0, darkness);
   }
   `;

   colourProgram = createWebGLProgram(gl, colourVertexShaderText, colourFragmentShaderText);
   darknessProgram = createWebGLProgram(gl, darknessVertexShaderText, darknessFragmentShaderText);

   const colourCameraBlockIndex = gl.getUniformBlockIndex(colourProgram, "Camera");
   gl.uniformBlockBinding(colourProgram, colourCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const darknessCameraBlockIndex = gl.getUniformBlockIndex(colourProgram, "Camera");
   gl.uniformBlockBinding(darknessProgram, darknessCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   darkenFactorUniformLocation = gl.getUniformLocation(darknessProgram, "u_darkenFactor")!;

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

   let ambientLight: number;
   if (Board.time >= 6 && Board.time < 18) {
      ambientLight = 1;
   } else if (Board.time >= 18 && Board.time < 20) {
      ambientLight = lerp(1, NIGHT_LIGHT, (Board.time - 18) / 2);
   } else if (Board.time >= 4 && Board.time < 6) {
      ambientLight = lerp(1, NIGHT_LIGHT, (6 - Board.time) / 2);
   } else {
      ambientLight = NIGHT_LIGHT;
   }

   const lightPositions = new Array<number>();
   const lightIntensities = new Array<number>();
   const lightStrengths = new Array<number>();
   const lightRadii = new Array<number>();
   const lightColours = new Array<number>();
   for (const light of Board.lights) {
      lightPositions.push(light.position.x);
      lightPositions.push(light.position.y);
      lightIntensities.push(light.intensity);
      lightStrengths.push(light.strength);
      lightRadii.push(light.radius);
      lightColours.push(light.r);
      lightColours.push(light.g);
      lightColours.push(light.b);
   }

   gl.useProgram(colourProgram);

   gl.enable(gl.BLEND);
   // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   // gl.blendFunc(gl.DST_COLOR, gl.ZERO);
   // gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ZERO);
   // gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
   gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ZERO);
   // gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ZERO);

   // - doesn't affect existing colour, chooses the co

   gl.bindVertexArray(vao);

   const colourNumLightsLocation = gl.getUniformLocation(colourProgram, "u_numLights")!;
   gl.uniform1i(colourNumLightsLocation, Board.lights.length);
   if (Board.lights.length > 0) {
      const lightPosLocation = gl.getUniformLocation(colourProgram, "u_lightPositions")!;
      gl.uniform2fv(lightPosLocation, new Float32Array(lightPositions));
      const lightIntensityLocation = gl.getUniformLocation(colourProgram, "u_lightIntensities")!;
      gl.uniform1fv(lightIntensityLocation, new Float32Array(lightIntensities));
      const lightStrengthLocation = gl.getUniformLocation(colourProgram, "u_lightStrengths")!;
      gl.uniform1fv(lightStrengthLocation, new Float32Array(lightStrengths));
      const lightRadiiLocation = gl.getUniformLocation(colourProgram, "u_lightRadii")!;
      gl.uniform1fv(lightRadiiLocation, new Float32Array(lightRadii));
      const lightColourLocation = gl.getUniformLocation(colourProgram, "u_lightColours")!;
      gl.uniform3fv(lightColourLocation, new Float32Array(lightColours));
   }

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.useProgram(darknessProgram);

   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   gl.uniform1f(darkenFactorUniformLocation, ambientLight);

   const darknessNumLightsLocation = gl.getUniformLocation(darknessProgram, "u_numLights")!;
   gl.uniform1i(darknessNumLightsLocation, Board.lights.length);
   if (Board.lights.length > 0) {
      const lightPosLocation = gl.getUniformLocation(darknessProgram, "u_lightPositions")!;
      gl.uniform2fv(lightPosLocation, new Float32Array(lightPositions));
      const lightIntensityLocation = gl.getUniformLocation(darknessProgram, "u_lightIntensities")!;
      gl.uniform1fv(lightIntensityLocation, new Float32Array(lightIntensities));
      const lightStrengthLocation = gl.getUniformLocation(darknessProgram, "u_lightStrengths")!;
      gl.uniform1fv(lightStrengthLocation, new Float32Array(lightStrengths));
      const lightRadiiLocation = gl.getUniformLocation(darknessProgram, "u_lightRadii")!;
      gl.uniform1fv(lightRadiiLocation, new Float32Array(lightRadii));
   }

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}