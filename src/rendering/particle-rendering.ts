import { rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import { createWebGLProgram, gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import Camera from "../Camera";
import MonocolourParticle from "../particles/MonocolourParticle";
import TexturedParticle from "../particles/TexturedParticle";
import ObjectBufferContainer from "./object-buffer-container";
import { getTexture } from "../textures";

const TEXTURE_ATLAS_SIZE = 8;

const OBJECT_BUFFER_CONTAINER_SIZE = 4096;
const MONOCOLOUR_PROGRAM_VERTEX_SIZE = 14;
const TEXTURED_PROGRAM_VERTEX_SIZE = 13;

export type ParticleColour = [r: number, g: number, b: number];

const monocolourVertexShaderText = `#version 300 es
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

   vec2 screenPos = (position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_opacity = a_opacity;
   v_tint = a_tint;
   v_spawnTime = a_spawnTime;
   v_currentTime = u_currentTime;
}
`;

const monocolourFragmentShaderText = `#version 300 es
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

export function addMonocolourParticleToBufferContainer(particle: MonocolourParticle, width: number, height: number, positionX: number, positionY: number, velocityX: number, velocityY: number, accelerationX: number, accelerationY: number, initialRotation: number, angularVelocity: number, angularAcceleration: number): void {
   const spawnTime = performance.now();
   
   const scaledWidth = width * particle.scale;
   const scaledHeight = height * particle.scale;

   const x1 = positionX - scaledWidth / 2;
   const x2 = positionX + scaledWidth / 2;
   const y1 = positionY - scaledHeight / 2;
   const y2 = positionY + scaledHeight / 2;

   // @Incomplete
   const topLeftX = rotateXAroundPoint(x1, y2, positionX, positionY, initialRotation);
   const topLeftY = rotateYAroundPoint(x1, y2, positionX, positionY, initialRotation);
   const topRightX = rotateXAroundPoint(x2, y2, positionX, positionY, initialRotation);
   const topRightY = rotateYAroundPoint(x2, y2, positionX, positionY, initialRotation);
   const bottomLeftX = rotateXAroundPoint(x1, y1, positionX, positionY, initialRotation);
   const bottomLeftY = rotateYAroundPoint(x1, y1, positionX, positionY, initialRotation);
   const bottomRightX = rotateXAroundPoint(x2, y1, positionX, positionY, initialRotation);
   const bottomRightY = rotateYAroundPoint(x2, y1, positionX, positionY, initialRotation);

   // Update opacity
   let opacity = particle.opacity;
   if (typeof particle.getOpacity !== "undefined") {
      opacity = particle.getOpacity(particle.age);
   }

   const vertexData = new Float32Array(6 * MONOCOLOUR_PROGRAM_VERTEX_SIZE);

   vertexData[0] = bottomLeftX;
   vertexData[1] = bottomLeftY;
   vertexData[2] = velocityX;
   vertexData[3] = velocityY;
   vertexData[4] = accelerationX;
   vertexData[5] = accelerationY;
   vertexData[6] = opacity;
   vertexData[7] = particle.colour[0];
   vertexData[8] = particle.colour[1];
   vertexData[9] = particle.colour[2];
   vertexData[10] = initialRotation;
   vertexData[11] = angularVelocity;
   vertexData[12] = angularAcceleration;
   vertexData[13] = spawnTime;

   vertexData[14] = bottomRightX;
   vertexData[15] = bottomRightY;
   vertexData[16] = velocityX;
   vertexData[17] = velocityY;
   vertexData[18] = accelerationX;
   vertexData[19] = accelerationY;
   vertexData[20] = opacity;
   vertexData[21] = particle.colour[0];
   vertexData[22] = particle.colour[1];
   vertexData[23] = particle.colour[2];
   vertexData[24] = initialRotation;
   vertexData[25] = angularVelocity;
   vertexData[26] = angularAcceleration;
   vertexData[27] = spawnTime;

   vertexData[28] = topLeftX;
   vertexData[29] = topLeftY;
   vertexData[30] = velocityX;
   vertexData[31] = velocityY;
   vertexData[32] = accelerationX;
   vertexData[33] = accelerationY;
   vertexData[34] = opacity;
   vertexData[35] = particle.colour[0];
   vertexData[36] = particle.colour[1];
   vertexData[37] = particle.colour[2];
   vertexData[38] = initialRotation;
   vertexData[39] = angularVelocity;
   vertexData[40] = angularAcceleration;
   vertexData[41] = spawnTime;

   vertexData[42] = topLeftX;
   vertexData[43] = topLeftY;
   vertexData[44] = velocityX;
   vertexData[45] = velocityY;
   vertexData[46] = accelerationX;
   vertexData[47] = accelerationY;
   vertexData[48] = opacity;
   vertexData[49] = particle.colour[0];
   vertexData[50] = particle.colour[1];
   vertexData[51] = particle.colour[2];
   vertexData[52] = initialRotation;
   vertexData[53] = angularVelocity;
   vertexData[54] = angularAcceleration;
   vertexData[55] = spawnTime;

   vertexData[56] = bottomRightX;
   vertexData[57] = bottomRightY;
   vertexData[58] = velocityX;
   vertexData[59] = velocityY;
   vertexData[60] = accelerationX;
   vertexData[61] = accelerationY;
   vertexData[62] = opacity;
   vertexData[63] = particle.colour[0];
   vertexData[64] = particle.colour[1];
   vertexData[65] = particle.colour[2];
   vertexData[66] = initialRotation;
   vertexData[67] = angularVelocity;
   vertexData[68] = angularAcceleration;
   vertexData[69] = spawnTime;

   vertexData[70] = topRightX;
   vertexData[71] = topRightY;
   vertexData[72] = velocityX;
   vertexData[73] = velocityY;
   vertexData[74] = accelerationX;
   vertexData[75] = accelerationY;
   vertexData[76] = opacity;
   vertexData[77] = particle.colour[0];
   vertexData[78] = particle.colour[1];
   vertexData[79] = particle.colour[2];
   vertexData[80] = initialRotation;
   vertexData[81] = angularVelocity;
   vertexData[82] = angularAcceleration;
   vertexData[83] = spawnTime;

   lowMonocolourBufferContainer.addObjectData(particle.id, vertexData);
}

export function addTexturedParticleToBufferContainer(particle: TexturedParticle, width: number, height: number, positionX: number, positionY: number, velocityX: number, velocityY: number, accelerationX: number, accelerationY: number, textureIndex: number, initialRotation: number, angularVelocity: number, angularAcceleration: number): void {
   const spawnTime = performance.now();
   
   const scaledWidth = width * particle.scale;
   const scaledHeight = height * particle.scale;

   const x1 = positionX - scaledWidth / 2;
   const x2 = positionX + scaledWidth / 2;
   const y1 = positionY - scaledHeight / 2;
   const y2 = positionY + scaledHeight / 2;

   const topLeftX = rotateXAroundPoint(x1, y2, positionX, positionY, initialRotation);
   const topLeftY = rotateYAroundPoint(x1, y2, positionX, positionY, initialRotation);
   const topRightX = rotateXAroundPoint(x2, y2, positionX, positionY, initialRotation);
   const topRightY = rotateYAroundPoint(x2, y2, positionX, positionY, initialRotation);
   const bottomLeftX = rotateXAroundPoint(x1, y1, positionX, positionY, initialRotation);
   const bottomLeftY = rotateYAroundPoint(x1, y1, positionX, positionY, initialRotation);
   const bottomRightX = rotateXAroundPoint(x2, y1, positionX, positionY, initialRotation);
   const bottomRightY = rotateYAroundPoint(x2, y1, positionX, positionY, initialRotation);

   // Update opacity
   let opacity = particle.opacity;
   if (typeof particle.getOpacity !== "undefined") {
      opacity = particle.getOpacity(particle.age);
   }

   const vertexData = new Float32Array(6 * TEXTURED_PROGRAM_VERTEX_SIZE);

   const textureXIndex = textureIndex % TEXTURE_ATLAS_SIZE;
   const textureYIndex = Math.floor(textureIndex / TEXTURE_ATLAS_SIZE);

   let texCoordX0 = textureXIndex / TEXTURE_ATLAS_SIZE;
   let texCoordX1 = (textureXIndex + 1) / TEXTURE_ATLAS_SIZE;
   let texCoordY0 = 1 - textureYIndex / TEXTURE_ATLAS_SIZE;
   let texCoordY1 = 1 - (textureYIndex + 1) / TEXTURE_ATLAS_SIZE;

   vertexData[0] = bottomLeftX;
   vertexData[1] = bottomLeftY;
   vertexData[2] = velocityX;
   vertexData[3] = velocityY;
   vertexData[4] = accelerationX;
   vertexData[5] = accelerationY;
   vertexData[6] = texCoordX0;
   vertexData[7] = texCoordY0;
   vertexData[8] = opacity;
   vertexData[9] = particle.tint[0];
   vertexData[10] = particle.tint[1];
   vertexData[11] = particle.tint[2];
   vertexData[12] = spawnTime;

   vertexData[13] = bottomRightX;
   vertexData[14] = bottomRightY;
   vertexData[15] = velocityX;
   vertexData[16] = velocityY;
   vertexData[17] = accelerationX;
   vertexData[18] = accelerationY;
   vertexData[19] = texCoordX1;
   vertexData[20] = texCoordY0;
   vertexData[21] = opacity;
   vertexData[22] = particle.tint[0];
   vertexData[23] = particle.tint[1];
   vertexData[24] = particle.tint[2];
   vertexData[25] = spawnTime;

   vertexData[26] = topLeftX;
   vertexData[27] = topLeftY;
   vertexData[28] = velocityX;
   vertexData[29] = velocityY;
   vertexData[30] = accelerationX;
   vertexData[31] = accelerationY;
   vertexData[32] = texCoordX0;
   vertexData[33] = texCoordY1;
   vertexData[34] = opacity;
   vertexData[35] = particle.tint[0];
   vertexData[36] = particle.tint[1];
   vertexData[37] = particle.tint[2];
   vertexData[38] = spawnTime;

   vertexData[39] = topLeftX;
   vertexData[40] = topLeftY;
   vertexData[41] = velocityX;
   vertexData[42] = velocityY;
   vertexData[43] = accelerationX;
   vertexData[44] = accelerationY;
   vertexData[45] = texCoordX0;
   vertexData[46] = texCoordY1;
   vertexData[47] = opacity;
   vertexData[48] = particle.tint[0];
   vertexData[49] = particle.tint[1];
   vertexData[50] = particle.tint[2];
   vertexData[51] = spawnTime;

   vertexData[52] = bottomRightX;
   vertexData[53] = bottomRightY;
   vertexData[54] = velocityX;
   vertexData[55] = velocityY;
   vertexData[56] = accelerationX;
   vertexData[57] = accelerationY;
   vertexData[58] = texCoordX1;
   vertexData[59] = texCoordY0;
   vertexData[60] = opacity;
   vertexData[61] = particle.tint[0];
   vertexData[62] = particle.tint[1];
   vertexData[63] = particle.tint[2];
   vertexData[64] = spawnTime;

   vertexData[65] = topRightX;
   vertexData[66] = topRightY;
   vertexData[67] = velocityX;
   vertexData[68] = velocityY;
   vertexData[69] = accelerationX;
   vertexData[70] = accelerationY;
   vertexData[71] = texCoordX1;
   vertexData[72] = texCoordY1;
   vertexData[73] = opacity;
   vertexData[74] = particle.tint[0];
   vertexData[75] = particle.tint[1];
   vertexData[76] = particle.tint[2];
   vertexData[77] = spawnTime;

   lowTexturedBufferContainer.addObjectData(particle.id, vertexData);
}

export function testFunction2(particle: MonocolourParticle): void {
   lowMonocolourBufferContainer.removeObject(particle.id);
}

export function testFunction3(particle: TexturedParticle): void {
   lowTexturedBufferContainer.removeObject(particle.id);
}

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
   lowMonocolourBufferContainer = new ObjectBufferContainer(OBJECT_BUFFER_CONTAINER_SIZE, 6 * MONOCOLOUR_PROGRAM_VERTEX_SIZE);
   lowTexturedBufferContainer = new ObjectBufferContainer(OBJECT_BUFFER_CONTAINER_SIZE, 6 * TEXTURED_PROGRAM_VERTEX_SIZE);

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


export function renderMonocolourParticles(particles: ReadonlyArray<MonocolourParticle>): void {
   gl.useProgram(monocolourProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (const buffer of lowMonocolourBufferContainer.getBuffers()) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, MONOCOLOUR_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, MONOCOLOUR_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, MONOCOLOUR_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, MONOCOLOUR_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(4, 3, gl.FLOAT, false, MONOCOLOUR_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(5, 1, gl.FLOAT, false, MONOCOLOUR_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 10 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(6, 1, gl.FLOAT, false, MONOCOLOUR_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(7, 1, gl.FLOAT, false, MONOCOLOUR_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 12 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(8, 1, gl.FLOAT, false, MONOCOLOUR_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 13 * Float32Array.BYTES_PER_ELEMENT);
   
      // Enable the attributes
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      gl.enableVertexAttribArray(2);
      gl.enableVertexAttribArray(3);
      gl.enableVertexAttribArray(4);
      gl.enableVertexAttribArray(5);
      gl.enableVertexAttribArray(6);
      gl.enableVertexAttribArray(7);
      gl.enableVertexAttribArray(8);
   
      gl.uniform2f(monocolourPlayerPositionUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(monocolourHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(monocolourZoomUniformLocation, Camera.zoom);
      gl.uniform1f(monocolourCurrentTimeUniformLocation, performance.now());
   
      gl.drawArrays(gl.TRIANGLES, 0, OBJECT_BUFFER_CONTAINER_SIZE * 6);
   }
   
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

export function renderTexturedParticles(particles: ReadonlyArray<TexturedParticle>): void {
   gl.useProgram(texturedProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const atlasTexture = getTexture("miscellaneous/particle-texture-atlas.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, atlasTexture);

   for (const buffer of lowTexturedBufferContainer.getBuffers()) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(3, 2, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(4, 1, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(5, 3, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 9 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(6, 1, gl.FLOAT, false, TEXTURED_PROGRAM_VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT, 12 * Float32Array.BYTES_PER_ELEMENT);
   
      // Enable the attributes
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      gl.enableVertexAttribArray(2);
      gl.enableVertexAttribArray(3);
      gl.enableVertexAttribArray(4);
      gl.enableVertexAttribArray(5);
      gl.enableVertexAttribArray(6);
   
      gl.uniform2f(texturedPlayerPositionUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(texturedHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(texturedZoomUniformLocation, Camera.zoom);
      gl.uniform1i(texturedTextureUniformLocation, 0);
      gl.uniform1f(texturedCurrentTimeUniformLocation, performance.now());
   
      gl.drawArrays(gl.TRIANGLES, 0, OBJECT_BUFFER_CONTAINER_SIZE * 6);
   }
   
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
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