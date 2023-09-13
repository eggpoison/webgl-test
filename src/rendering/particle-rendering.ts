import { lerp, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import { createWebGLProgram, gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import Camera from "../Camera";
import MonocolourParticle from "../particles/MonocolourParticle";
import TexturedParticle from "../particles/TexturedParticle";
import ObjectBufferContainer from "./object-buffer-container";
import { getTexture } from "../textures";

const TEXTURE_ATLAS_SIZE = 8;

const OBJECT_BUFFER_CONTAINER_SIZE = 4096;
const TEXTURED_PROGRAM_VERTEX_SIZE = 13;

export type ParticleColour = [r: number, g: number, b: number];

export function interpolateColours(startColour: Readonly<ParticleColour>, endColour: Readonly<ParticleColour>, amount: number): ParticleColour {
   return [
      lerp(startColour[0], endColour[0], amount),
      lerp(startColour[1], endColour[1], amount),
      lerp(startColour[2], endColour[2], amount)
   ];
}

const monocolourVertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;
uniform float u_currentTime;

layout(location = 0) in vec2 a_position;

void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
const monocolourFragmentShaderText = `#version 300 es
precision mediump float;

out vec4 outputColour;

void main() {
   outputColour = vec4(1.0, 0.0, 0.5, 1.0);
}
`;
const monocolourVertexShaderText2 = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;
uniform float u_currentTime;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_velocity;
layout(location = 2) in vec2 a_acceleration;
layout(location = 3) in float a_opacity;
layout(location = 4) in vec3 a_tint;
layout(location = 5) in float a_initialRotation;
layout(location = 6) in float a_angularVelocity;
layout(location = 7) in float a_angularAcceleration;
layout(location = 8) in float a_spawnTime;

out float v_opacity;
out vec3 v_tint;
out float v_spawnTime;
out float v_currentTime;

void main() {
   float age = (u_currentTime - a_spawnTime) / 1000.0;

   vec2 velocity = a_velocity;
   velocity /= 20.0;

   vec2 acceleration = a_acceleration;
   acceleration /= 20.0;
   
   vec2 position = a_position + a_velocity * age + a_acceleration * age * age * 0.5;

   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_opacity = a_opacity;
   v_tint = a_tint;
   v_spawnTime = a_spawnTime;
   v_currentTime = u_currentTime;
}
`;

const monocolourFragmentShaderText2 = `#version 300 es
precision mediump float;

in float v_opacity;
in vec3 v_tint;
in float v_spawnTime;
in float v_currentTime;

out vec4 outputColour;

void main() {
   float age = v_currentTime - v_spawnTime;
   
   outputColour = vec4(v_tint.r, v_tint.g, v_tint.b, v_opacity);
}
`;

const texturedVertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;
uniform float u_currentTime;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_velocity;
layout(location = 2) in vec2 a_acceleration;
layout(location = 3) in vec2 a_texCoord;
layout(location = 4) in float a_opacity;
layout(location = 5) in vec3 a_tint;
layout(location = 6) in float a_spawnTime;

out vec2 v_texCoord;
out float v_opacity;
out vec3 v_tint;

void main() {
   float age = (u_currentTime - a_spawnTime) / 1000.0;

   vec2 velocity = a_velocity;
   velocity /= 20.0;

   vec2 acceleration = a_acceleration;
   acceleration /= 20.0;
   
   vec2 position = a_position + a_velocity * age + a_acceleration * age * age * 0.5;

   vec2 screenPos = (position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_opacity = a_opacity;
   v_tint = a_tint;
}
`;

const texturedFragmentShaderText = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;

in vec2 v_texCoord;
in float v_opacity;
in vec3 v_tint;

out vec4 outputColour;

void main() {
   vec4 textureColour = texture(u_texture, v_texCoord);
   
   if (v_tint.r > 0.0) {
      textureColour.r = mix(textureColour.r, 1.0, v_tint.r);
   } else {
      textureColour.r = mix(textureColour.r, 0.0, -v_tint.r);
   }
   if (v_tint.g > 0.0) {
      textureColour.g = mix(textureColour.g, 1.0, v_tint.g);
   } else {
      textureColour.g = mix(textureColour.g, 0.0, -v_tint.g);
   }
   if (v_tint.b > 0.0) {
      textureColour.b = mix(textureColour.b, 1.0, v_tint.b);
   } else {
      textureColour.b = mix(textureColour.b, 0.0, -v_tint.b);
   }

   textureColour.a *= v_opacity;

   outputColour = textureColour;
}
`;

let lowMonocolourBufferContainer: ObjectBufferContainer;
let lowTexturedBufferContainer: ObjectBufferContainer;

let monocolourProgram: WebGLProgram;
let texturedProgram: WebGLProgram;

let monocolourPlayerPositionUniformLocation: WebGLUniformLocation;
let monocolourHalfWindowSizeUniformLocation: WebGLUniformLocation;
let monocolourZoomUniformLocation: WebGLUniformLocation;
let monocolourCurrentTimeUniformLocation: WebGLUniformLocation;

let texturedPlayerPositionUniformLocation: WebGLUniformLocation;
let texturedHalfWindowSizeUniformLocation: WebGLUniformLocation;
let texturedZoomUniformLocation: WebGLUniformLocation;
let texturedTextureUniformLocation: WebGLUniformLocation;
let texturedCurrentTimeUniformLocation: WebGLUniformLocation;

export function createParticleShaders(): void {
   lowMonocolourBufferContainer = new ObjectBufferContainer(OBJECT_BUFFER_CONTAINER_SIZE);
   lowMonocolourBufferContainer.registerNewBufferType(6 * 2); // Position
   // lowMonocolourBufferContainer.registerNewBufferType(2);     // Velocity
   // lowMonocolourBufferContainer.registerNewBufferType(2);     // Acceleration
   // lowMonocolourBufferContainer.registerNewBufferType(1);     // Opacity
   // lowMonocolourBufferContainer.registerNewBufferType(3);     // Colour
   // lowMonocolourBufferContainer.registerNewBufferType(1);     // Initial rotation
   // lowMonocolourBufferContainer.registerNewBufferType(1);     // Angular velocity
   // lowMonocolourBufferContainer.registerNewBufferType(1);     // Angular acceleration
   // lowMonocolourBufferContainer.registerNewBufferType(1);     // Spawn time

   lowTexturedBufferContainer = new ObjectBufferContainer(OBJECT_BUFFER_CONTAINER_SIZE);

   // 
   // Monocolour program
   // 
   
   monocolourProgram = createWebGLProgram(gl, monocolourVertexShaderText, monocolourFragmentShaderText);
   
   monocolourPlayerPositionUniformLocation = gl.getUniformLocation(monocolourProgram, "u_playerPos")!;
   monocolourHalfWindowSizeUniformLocation = gl.getUniformLocation(monocolourProgram, "u_halfWindowSize")!;
   monocolourZoomUniformLocation = gl.getUniformLocation(monocolourProgram, "u_zoom")!;
   monocolourCurrentTimeUniformLocation = gl.getUniformLocation(monocolourProgram, "u_currentTime")!

   // 
   // Textured program
   // 
   
   texturedProgram = createWebGLProgram(gl, texturedVertexShaderText, texturedFragmentShaderText);
   
   texturedPlayerPositionUniformLocation = gl.getUniformLocation(texturedProgram, "u_playerPos")!;
   texturedHalfWindowSizeUniformLocation = gl.getUniformLocation(texturedProgram, "u_halfWindowSize")!;
   texturedZoomUniformLocation = gl.getUniformLocation(texturedProgram, "u_zoom")!;
   texturedTextureUniformLocation = gl.getUniformLocation(texturedProgram, "u_texture")!;
   texturedCurrentTimeUniformLocation = gl.getUniformLocation(texturedProgram, "u_currentTime")!;
}

// @Speed colour array garbage collection, just pass in r g b as parameters
export function addMonocolourParticleToBufferContainer(particle: MonocolourParticle, width: number, height: number, positionX: number, positionY: number, velocityX: number, velocityY: number, accelerationX: number, accelerationY: number, initialRotation: number, angularVelocity: number, angularAcceleration: number, colour: ParticleColour): void {
   lowMonocolourBufferContainer.registerNewObject(particle.id);
   
   const spawnTime = performance.now();
   
   const scaledWidth = width * particle.scale;
   const scaledHeight = height * particle.scale;

   const x1 = positionX - scaledWidth / 2;
   const x2 = positionX + scaledWidth / 2;
   const y1 = positionY - scaledHeight / 2;
   const y2 = positionY + scaledHeight / 2;

   // const x1 = 10;
   // const x2 = 20;
   // const y1 = 10;
   // const y2 = 20;

   // @Incomplete
   const topLeftX = rotateXAroundPoint(x1, y2, positionX, positionY, initialRotation);
   const topLeftY = rotateYAroundPoint(x1, y2, positionX, positionY, initialRotation);
   const topRightX = rotateXAroundPoint(x2, y2, positionX, positionY, initialRotation);
   const topRightY = rotateYAroundPoint(x2, y2, positionX, positionY, initialRotation);
   const bottomLeftX = rotateXAroundPoint(x1, y1, positionX, positionY, initialRotation);
   const bottomLeftY = rotateYAroundPoint(x1, y1, positionX, positionY, initialRotation);
   const bottomRightX = rotateXAroundPoint(x2, y1, positionX, positionY, initialRotation);
   const bottomRightY = rotateYAroundPoint(x2, y1, positionX, positionY, initialRotation);
   // const topLeftX = x1;
   // const topLeftY = y2;
   // const topRightX = x2;
   // const topRightY = y2;
   // const bottomLeftX = x1;
   // const bottomLeftY = y1;
   // const bottomRightX = x2;
   // const bottomRightY = y1;

   // Update opacity
   let opacity: number;
   if (typeof particle.getOpacity !== "undefined") {
      opacity = particle.getOpacity(particle.age);
   } else {
      opacity = particle.opacity;
   }

   const positionData = new Float32Array(6 * 2);
   positionData[0] = bottomLeftX;
   positionData[1] = bottomLeftY;
   positionData[2] = bottomRightX;
   positionData[3] = bottomRightY;
   positionData[4] = topLeftX;
   positionData[5] = topLeftY;
   positionData[6] = topLeftX;
   positionData[7] = topLeftY;
   positionData[8] = bottomRightX;
   positionData[9] = bottomRightY;
   positionData[10] = topRightX;
   positionData[11] = topRightY;
   lowMonocolourBufferContainer.addObjectData(particle.id, 0, positionData);

   // const velocityData = new Float32Array(2);
   // velocityData[0] = velocityX;
   // velocityData[1] = velocityY;
   // lowMonocolourBufferContainer.addObjectData(particle.id, 1, velocityData);

   // const accelerationData = new Float32Array(2);
   // accelerationData[0] = accelerationX;
   // accelerationData[1] = accelerationY;
   // lowMonocolourBufferContainer.addObjectData(particle.id, 2, accelerationData);

   // const opacityData = new Float32Array(1);
   // opacityData[0] = opacity;
   // lowMonocolourBufferContainer.addObjectData(particle.id, 3, opacityData);

   // const colourData = new Float32Array(3);
   // colourData[0] = colour[0];
   // colourData[1] = colour[1];
   // colourData[2] = colour[2];
   // lowMonocolourBufferContainer.addObjectData(particle.id, 4, colourData);

   // const initialRotationData = new Float32Array(1);
   // initialRotationData[0] = initialRotation;
   // lowMonocolourBufferContainer.addObjectData(particle.id, 5, initialRotationData);

   // const angularVelocityData = new Float32Array(1);
   // angularVelocityData[0] = angularVelocity;
   // lowMonocolourBufferContainer.addObjectData(particle.id, 6, angularVelocityData);

   // const angularAccelerationData = new Float32Array(1);
   // angularAccelerationData[0] = angularAcceleration;
   // lowMonocolourBufferContainer.addObjectData(particle.id, 7, angularAccelerationData);

   // const spawnTimeData = new Float32Array(1);
   // spawnTimeData[0] = spawnTime;
   // lowMonocolourBufferContainer.addObjectData(particle.id, 8, spawnTimeData);
}

export function addTexturedParticleToBufferContainer(particle: TexturedParticle, width: number, height: number, positionX: number, positionY: number, velocityX: number, velocityY: number, accelerationX: number, accelerationY: number, textureIndex: number, initialRotation: number, angularVelocity: number, angularAcceleration: number): void {
   lowTexturedBufferContainer.registerNewObject(particle.id);
   // const spawnTime = performance.now();
   
   // const scaledWidth = width * particle.scale;
   // const scaledHeight = height * particle.scale;

   // const x1 = positionX - scaledWidth / 2;
   // const x2 = positionX + scaledWidth / 2;
   // const y1 = positionY - scaledHeight / 2;
   // const y2 = positionY + scaledHeight / 2;

   // const topLeftX = rotateXAroundPoint(x1, y2, positionX, positionY, initialRotation);
   // const topLeftY = rotateYAroundPoint(x1, y2, positionX, positionY, initialRotation);
   // const topRightX = rotateXAroundPoint(x2, y2, positionX, positionY, initialRotation);
   // const topRightY = rotateYAroundPoint(x2, y2, positionX, positionY, initialRotation);
   // const bottomLeftX = rotateXAroundPoint(x1, y1, positionX, positionY, initialRotation);
   // const bottomLeftY = rotateYAroundPoint(x1, y1, positionX, positionY, initialRotation);
   // const bottomRightX = rotateXAroundPoint(x2, y1, positionX, positionY, initialRotation);
   // const bottomRightY = rotateYAroundPoint(x2, y1, positionX, positionY, initialRotation);

   // // Update opacity
   // let opacity = particle.opacity;
   // if (typeof particle.getOpacity !== "undefined") {
   //    opacity = particle.getOpacity(particle.age);
   // }

   // const vertexData = new Float32Array(6 * TEXTURED_PROGRAM_VERTEX_SIZE);

   // const textureXIndex = textureIndex % TEXTURE_ATLAS_SIZE;
   // const textureYIndex = Math.floor(textureIndex / TEXTURE_ATLAS_SIZE);

   // let texCoordX0 = textureXIndex / TEXTURE_ATLAS_SIZE;
   // let texCoordX1 = (textureXIndex + 1) / TEXTURE_ATLAS_SIZE;
   // let texCoordY0 = 1 - textureYIndex / TEXTURE_ATLAS_SIZE;
   // let texCoordY1 = 1 - (textureYIndex + 1) / TEXTURE_ATLAS_SIZE;

   // vertexData[0] = bottomLeftX;
   // vertexData[1] = bottomLeftY;
   // vertexData[2] = velocityX;
   // vertexData[3] = velocityY;
   // vertexData[4] = accelerationX;
   // vertexData[5] = accelerationY;
   // vertexData[6] = texCoordX0;
   // vertexData[7] = texCoordY0;
   // vertexData[8] = opacity;
   // vertexData[9] = particle.tint[0];
   // vertexData[10] = particle.tint[1];
   // vertexData[11] = particle.tint[2];
   // vertexData[12] = spawnTime;

   // vertexData[13] = bottomRightX;
   // vertexData[14] = bottomRightY;
   // vertexData[15] = velocityX;
   // vertexData[16] = velocityY;
   // vertexData[17] = accelerationX;
   // vertexData[18] = accelerationY;
   // vertexData[19] = texCoordX1;
   // vertexData[20] = texCoordY0;
   // vertexData[21] = opacity;
   // vertexData[22] = particle.tint[0];
   // vertexData[23] = particle.tint[1];
   // vertexData[24] = particle.tint[2];
   // vertexData[25] = spawnTime;

   // vertexData[26] = topLeftX;
   // vertexData[27] = topLeftY;
   // vertexData[28] = velocityX;
   // vertexData[29] = velocityY;
   // vertexData[30] = accelerationX;
   // vertexData[31] = accelerationY;
   // vertexData[32] = texCoordX0;
   // vertexData[33] = texCoordY1;
   // vertexData[34] = opacity;
   // vertexData[35] = particle.tint[0];
   // vertexData[36] = particle.tint[1];
   // vertexData[37] = particle.tint[2];
   // vertexData[38] = spawnTime;

   // vertexData[39] = topLeftX;
   // vertexData[40] = topLeftY;
   // vertexData[41] = velocityX;
   // vertexData[42] = velocityY;
   // vertexData[43] = accelerationX;
   // vertexData[44] = accelerationY;
   // vertexData[45] = texCoordX0;
   // vertexData[46] = texCoordY1;
   // vertexData[47] = opacity;
   // vertexData[48] = particle.tint[0];
   // vertexData[49] = particle.tint[1];
   // vertexData[50] = particle.tint[2];
   // vertexData[51] = spawnTime;

   // vertexData[52] = bottomRightX;
   // vertexData[53] = bottomRightY;
   // vertexData[54] = velocityX;
   // vertexData[55] = velocityY;
   // vertexData[56] = accelerationX;
   // vertexData[57] = accelerationY;
   // vertexData[58] = texCoordX1;
   // vertexData[59] = texCoordY0;
   // vertexData[60] = opacity;
   // vertexData[61] = particle.tint[0];
   // vertexData[62] = particle.tint[1];
   // vertexData[63] = particle.tint[2];
   // vertexData[64] = spawnTime;

   // vertexData[65] = topRightX;
   // vertexData[66] = topRightY;
   // vertexData[67] = velocityX;
   // vertexData[68] = velocityY;
   // vertexData[69] = accelerationX;
   // vertexData[70] = accelerationY;
   // vertexData[71] = texCoordX1;
   // vertexData[72] = texCoordY1;
   // vertexData[73] = opacity;
   // vertexData[74] = particle.tint[0];
   // vertexData[75] = particle.tint[1];
   // vertexData[76] = particle.tint[2];
   // vertexData[77] = spawnTime;

   // lowTexturedBufferContainer.addObjectData(particle.id, vertexData);
}

// @Temporary name
export function testFunction2(particle: MonocolourParticle): void {
   lowMonocolourBufferContainer.removeObject(particle.id);
}

// @Temporary name
export function testFunction3(particle: TexturedParticle): void {
   lowTexturedBufferContainer.removeObject(particle.id);
}

export function renderMonocolourParticles(particles: ReadonlyArray<MonocolourParticle>): void {
   gl.useProgram(monocolourProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const positionBuffers = lowMonocolourBufferContainer.getBuffers(0);
   // const velocityBuffers = lowMonocolourBufferContainer.getBuffers(1);
   // const accelerationBuffers = lowMonocolourBufferContainer.getBuffers(2);
   // const opacityBuffers = lowMonocolourBufferContainer.getBuffers(3);
   // const colourBuffers = lowMonocolourBufferContainer.getBuffers(4);
   // const initialRotationBuffers = lowMonocolourBufferContainer.getBuffers(5);
   // const angularVelocityBuffers = lowMonocolourBufferContainer.getBuffers(6);
   // const angularAccelerationBuffers = lowMonocolourBufferContainer.getBuffers(7);
   // const spawnTimeBuffers = lowMonocolourBufferContainer.getBuffers(8);

   for (let i = 0; i < lowMonocolourBufferContainer.getNumBuffers(); i++) {
      const vertices = [
         -1, -1,
         1, -1,
         -1, 1,
         -1, 1,
         1, -1,
         1, 1,
      ];
      const data = new Float32Array(vertices);
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      
      // gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[i]);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribDivisor(0, 1);

   
      // gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffers[i]);
      // gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
      // gl.enableVertexAttribArray(1);
      // gl.vertexAttribDivisor(1, 1);

      // gl.bindBuffer(gl.ARRAY_BUFFER, accelerationBuffers[i]);
      // gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      // gl.enableVertexAttribArray(2);
      // gl.vertexAttribDivisor(2, 1);

      // gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffers[i]);
      // gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
      // gl.enableVertexAttribArray(3);
      // gl.vertexAttribDivisor(3, 1);

      // gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffers[i]);
      // gl.enableVertexAttribArray(4);
      // gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 0, 0);
      // gl.vertexAttribDivisor(4, 1);

      // gl.bindBuffer(gl.ARRAY_BUFFER, initialRotationBuffers[i]);
      // gl.enableVertexAttribArray(5);
      // gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 0, 0);
      // gl.vertexAttribDivisor(5, 1);

      // gl.bindBuffer(gl.ARRAY_BUFFER, angularVelocityBuffers[i]);
      // gl.enableVertexAttribArray(6);
      // gl.vertexAttribPointer(6, 1, gl.FLOAT, false, 0, 0);
      // gl.vertexAttribDivisor(6, 1);

      // gl.bindBuffer(gl.ARRAY_BUFFER, angularAccelerationBuffers[i]);
      // gl.enableVertexAttribArray(7);
      // gl.vertexAttribPointer(7, 1, gl.FLOAT, false, 0, 0);
      // gl.vertexAttribDivisor(7, 1);

      // gl.bindBuffer(gl.ARRAY_BUFFER, spawnTimeBuffers[i]);
      // gl.enableVertexAttribArray(8);
      // gl.vertexAttribPointer(8, 1, gl.FLOAT, false, 0, 0);
      // gl.vertexAttribDivisor(8, 1);
   
      gl.uniform2f(monocolourPlayerPositionUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(monocolourHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(monocolourZoomUniformLocation, Camera.zoom);
      gl.uniform1f(monocolourCurrentTimeUniformLocation, performance.now());
   
      // gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, OBJECT_BUFFER_CONTAINER_SIZE);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, 4);
      // gl.drawArrays(gl.TRIANGLES, 0, 6);
   }

   gl.vertexAttribDivisor(0, 0);
   // gl.vertexAttribDivisor(1, 0);
   // gl.vertexAttribDivisor(2, 0);
   // gl.vertexAttribDivisor(3, 0);
   // gl.vertexAttribDivisor(4, 0);
   // gl.vertexAttribDivisor(5, 0);
   // gl.vertexAttribDivisor(6, 0);
   // gl.vertexAttribDivisor(7, 0);
   // gl.vertexAttribDivisor(8, 0);
   
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

export function renderTexturedParticles(particles: ReadonlyArray<TexturedParticle>): void {
   // gl.useProgram(texturedProgram);

   // gl.enable(gl.BLEND);
   // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // const atlasTexture = getTexture("miscellaneous/particle-texture-atlas.png");
   // gl.activeTexture(gl.TEXTURE0);
   // gl.bindTexture(gl.TEXTURE_2D, atlasTexture);

   // for (const buffer of lowTexturedBufferContainer.getBuffers()) {
   //    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   
   //    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 0);
   //    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   //    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   //    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   //    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
   //    gl.vertexAttribPointer(5, 3, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 9 * Float32Array.BYTES_PER_ELEMENT);
   //    gl.vertexAttribPointer(6, 1, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 12 * Float32Array.BYTES_PER_ELEMENT);
   
   //    // Enable the attributes
   //    gl.enableVertexAttribArray(0);
   //    gl.enableVertexAttribArray(1);
   //    gl.enableVertexAttribArray(2);
   //    gl.enableVertexAttribArray(3);
   //    gl.enableVertexAttribArray(4);
   //    gl.enableVertexAttribArray(5);
   //    gl.enableVertexAttribArray(6);
   
   //    gl.uniform2f(texturedPlayerPositionUniformLocation, Camera.position.x, Camera.position.y);
   //    gl.uniform2f(texturedHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
   //    gl.uniform1f(texturedZoomUniformLocation, Camera.zoom);
   //    gl.uniform1i(texturedTextureUniformLocation, 0);
   //    gl.uniform1f(texturedCurrentTimeUniformLocation, performance.now());
   
   //    gl.drawArrays(gl.TRIANGLES, 0, OBJECT_BUFFER_CONTAINER_SIZE * 6);
   // }
   
   // gl.disable(gl.BLEND);
   // gl.blendFunc(gl.ONE, gl.ZERO);
   // @Incomplete

   // const groupedParticles = groupParticles(particles);

   // // Create vertices
   // const textureSources = new Array<string>();
   // const vertexDatas = new Array<Float32Array>();
   // const vertexCounts = new Array<number>();
   // for (let textureMappingIdx = 0; textureMappingIdx < numParticleTypes; textureMappingIdx++) {
   //    const currentParticles = groupedParticles[textureMappingIdx];
   //    if (currentParticles.length === 0) {
   //       continue;
   //    }

   //    const textureSource = currentParticles[0].textureSource;
   //    textureSources.push(textureSource);
   //    vertexCounts.push(currentParticles.length * 6 * 8);

   //    const vertexData = new Float32Array(currentParticles.length * 6 * 8);
   //    for (let i = 0; i < currentParticles.length; i++) {
   //       const particle = currentParticles[i];
         
   //       const width = particle.width * particle.scale;
   //       const height = particle.height * particle.scale;

   //       const renderPosition = calculateParticleRenderPosition(particle);

   //       const x1 = renderPosition.x - width / 2;
   //       const x2 = renderPosition.x + width / 2;
   //       const y1 = renderPosition.y - height / 2;
   //       const y2 = renderPosition.y + height / 2;

   //       const topLeftX = rotateXAroundPoint(x1, y2, renderPosition.x, renderPosition.y, particle.rotation);
   //       const topLeftY = rotateYAroundPoint(x1, y2, renderPosition.x, renderPosition.y, particle.rotation);
   //       const topRightX = rotateXAroundPoint(x2, y2, renderPosition.x, renderPosition.y, particle.rotation);
   //       const topRightY = rotateYAroundPoint(x2, y2, renderPosition.x, renderPosition.y, particle.rotation);
   //       const bottomLeftX = rotateXAroundPoint(x1, y1, renderPosition.x, renderPosition.y, particle.rotation);
   //       const bottomLeftY = rotateYAroundPoint(x1, y1, renderPosition.x, renderPosition.y, particle.rotation);
   //       const bottomRightX = rotateXAroundPoint(x2, y1, renderPosition.x, renderPosition.y, particle.rotation);
   //       const bottomRightY = rotateYAroundPoint(x2, y1, renderPosition.x, renderPosition.y, particle.rotation);

   //       // Update opacity
   //       let opacity = particle.opacity;
   //       if (typeof particle.getOpacity !== "undefined") {
   //          opacity = particle.getOpacity(particle.age);
   //       }
         
   //       // TODO: Surely there is a less awful way of doing this?
   //       vertexData[i * 6 * 8] = bottomLeftX;
   //       vertexData[i * 6 * 8 + 1] = bottomLeftY;
   //       vertexData[i * 6 * 8 + 2] = 0;
   //       vertexData[i * 6 * 8 + 3] = 0;
   //       vertexData[i * 6 * 8 + 4] = opacity;
   //       vertexData[i * 6 * 8 + 5] = particle.tint[0];
   //       vertexData[i * 6 * 8 + 6] = particle.tint[1];
   //       vertexData[i * 6 * 8 + 7] = particle.tint[2];

   //       vertexData[i * 6 * 8 + 8] = bottomRightX;
   //       vertexData[i * 6 * 8 + 9] = bottomRightY;
   //       vertexData[i * 6 * 8 + 10] = 1;
   //       vertexData[i * 6 * 8 + 11] = 0;
   //       vertexData[i * 6 * 8 + 12] = opacity;
   //       vertexData[i * 6 * 8 + 13] = particle.tint[0];
   //       vertexData[i * 6 * 8 + 14] = particle.tint[1];
   //       vertexData[i * 6 * 8 + 15] = particle.tint[2];

   //       vertexData[i * 6 * 8 + 16] = topLeftX;
   //       vertexData[i * 6 * 8 + 17] = topLeftY;
   //       vertexData[i * 6 * 8 + 18] = 0;
   //       vertexData[i * 6 * 8 + 19] = 1;
   //       vertexData[i * 6 * 8 + 20] = opacity;
   //       vertexData[i * 6 * 8 + 21] = particle.tint[0];
   //       vertexData[i * 6 * 8 + 22] = particle.tint[1];
   //       vertexData[i * 6 * 8 + 23] = particle.tint[2];

   //       vertexData[i * 6 * 8 + 24] = topLeftX;
   //       vertexData[i * 6 * 8 + 25] = topLeftY;
   //       vertexData[i * 6 * 8 + 26] = 0;
   //       vertexData[i * 6 * 8 + 27] = 1;
   //       vertexData[i * 6 * 8 + 28] = opacity;
   //       vertexData[i * 6 * 8 + 29] = particle.tint[0];
   //       vertexData[i * 6 * 8 + 30] = particle.tint[1];
   //       vertexData[i * 6 * 8 + 31] = particle.tint[2];

   //       vertexData[i * 6 * 8 + 32] = bottomRightX;
   //       vertexData[i * 6 * 8 + 33] = bottomRightY;
   //       vertexData[i * 6 * 8 + 34] = 1;
   //       vertexData[i * 6 * 8 + 35] = 0;
   //       vertexData[i * 6 * 8 + 36] = opacity;
   //       vertexData[i * 6 * 8 + 37] = particle.tint[0];
   //       vertexData[i * 6 * 8 + 38] = particle.tint[1];
   //       vertexData[i * 6 * 8 + 39] = particle.tint[2];

   //       vertexData[i * 6 * 8 + 40] = topRightX;
   //       vertexData[i * 6 * 8 + 41] = topRightY;
   //       vertexData[i * 6 * 8 + 42] = 1;
   //       vertexData[i * 6 * 8 + 43] = 1;
   //       vertexData[i * 6 * 8 + 44] = opacity;
   //       vertexData[i * 6 * 8 + 45] = particle.tint[0];
   //       vertexData[i * 6 * 8 + 46] = particle.tint[1];
   //       vertexData[i * 6 * 8 + 47] = particle.tint[2];
   //    }
   //    vertexDatas.push(vertexData);
   // }

   // gl.useProgram(texturedProgram);

   // gl.enable(gl.BLEND);
   // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // for (let i = 0; i < textureSources.length; i++) {
   //    const textureSource = textureSources[i];
   //    const vertexData = vertexDatas[i];
   //    const vertexCount = vertexCounts[i];

   //    // Create buffer
   //    const buffer = gl.createBuffer();
   //    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   //    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

   //    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
   //    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   //    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   //    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

   //    // Enable the attributes
   //    gl.enableVertexAttribArray(0);
   //    gl.enableVertexAttribArray(1);
   //    gl.enableVertexAttribArray(2);
   //    gl.enableVertexAttribArray(3);

   //    gl.uniform2f(texturedPlayerPositionUniformLocation, Camera.position.x, Camera.position.y);
   //    gl.uniform2f(texturedHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
   //    gl.uniform1f(texturedZoomUniformLocation, Camera.zoom);
   //    gl.uniform1i(texturedTextureUniformLocation, 0);

   //    const texture = getTexture(textureSource);
   //    gl.activeTexture(gl.TEXTURE0);
   //    gl.bindTexture(gl.TEXTURE_2D, texture);

   //    // Draw the vertices
   //    gl.drawArrays(gl.TRIANGLES, 0, vertexCount / 8);
   // }

   // gl.disable(gl.BLEND);
   // gl.blendFunc(gl.ONE, gl.ZERO);
}