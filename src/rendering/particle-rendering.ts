import { Point, SETTINGS, Vector, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import { createWebGLProgram, gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import Camera from "../Camera";
import Particle, { PARTICLE_INFO } from "../particles/Particle";
import { getTexture } from "../textures";
import { getFrameProgress } from "../GameObject";
import MonocolourParticle from "../particles/MonocolourParticle";
import TexturedParticle from "../particles/TexturedParticle";

export const PARTICLE_TEXTURE_MAPPINGS = {
   "particles/blood-pool-small.png": 0,
   "particles/blood-pool-medium.png": 1,
   "particles/blood-pool-large.png": 2,
   "particles/dirt.png": 3,
   "particles/leaf.png": 4,
   "particles/rock.png": 5,
   "particles/rock-large.png": 6,
   "entities/cactus/cactus-flower-small-1.png": 7,
   "entities/cactus/cactus-flower-large-1.png": 8,
   "entities/cactus/cactus-flower-small-2.png": 9,
   "entities/cactus/cactus-flower-large-2.png": 10,
   "entities/cactus/cactus-flower-small-3.png": 11,
   "entities/cactus/cactus-flower-large-3.png": 12,
   "entities/cactus/cactus-flower-small-4.png": 13,
   "entities/cactus/cactus-flower-large-4.png": 14,
   "entities/cactus/cactus-flower-5.png": 15,
   "particles/smoke-black.png": 16,
   "particles/footprint.png": 17,
   "particles/poison-droplet.png": 18,
   "particles/slime-puddle.png": 19,
   "particles/water-splash.png": 20,
   "particles/leaf-small.png": 21
} satisfies Record<string, number>;

export type ParticleTextureSource = keyof typeof PARTICLE_TEXTURE_MAPPINGS;

export type ParticleColour = [r: number, g: number, b: number];

const monocolourVertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

layout(location = 0) in vec2 a_position;
layout(location = 1) in float a_opacity;
layout(location = 2) in vec3 a_tint;

out float v_opacity;
out vec3 v_tint;

void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_opacity = a_opacity;
   v_tint = a_tint;
}
`;

const monocolourFragmentShaderText = `#version 300 es
precision mediump float;

in float v_opacity;
in vec3 v_tint;

out vec4 outputColour;

void main() {
   outputColour = vec4(v_tint.r, v_tint.g, v_tint.b, v_opacity);
}
`;

const texturedVertexShaderText = `#version 300 es
precision mediump float;

uniform vec2 u_playerPos;
uniform vec2 u_halfWindowSize;
uniform float u_zoom;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in float a_opacity;
layout(location = 3) in vec3 a_tint;

out vec2 v_texCoord;
out float v_opacity;
out vec3 v_tint;

void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
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

let monocolourProgram: WebGLProgram;
let texturedProgram: WebGLProgram;

let monocolourPlayerPositionUniformLocation: WebGLUniformLocation;
let monocolourHalfWindowSizeUniformLocation: WebGLUniformLocation;
let monocolourZoomUniformLocation: WebGLUniformLocation;

let texturedPlayerPositionUniformLocation: WebGLUniformLocation;
let texturedHalfWindowSizeUniformLocation: WebGLUniformLocation;
let texturedZoomUniformLocation: WebGLUniformLocation;
let texturedTextureUniformLocation: WebGLUniformLocation;

export function createParticleShaders(): void {
   // 
   // Textured program
   // 
   
   texturedProgram = createWebGLProgram(gl, texturedVertexShaderText, texturedFragmentShaderText);
   
   texturedPlayerPositionUniformLocation = gl.getUniformLocation(texturedProgram, "u_playerPos")!;
   texturedHalfWindowSizeUniformLocation = gl.getUniformLocation(texturedProgram, "u_halfWindowSize")!;
   texturedZoomUniformLocation = gl.getUniformLocation(texturedProgram, "u_zoom")!;
   texturedTextureUniformLocation = gl.getUniformLocation(texturedProgram, "u_texture")!;

   // 
   // Monocolour program
   // 
   
   monocolourProgram = createWebGLProgram(gl, monocolourVertexShaderText, monocolourFragmentShaderText);
   
   monocolourPlayerPositionUniformLocation = gl.getUniformLocation(monocolourProgram, "u_playerPos")!;
   monocolourHalfWindowSizeUniformLocation = gl.getUniformLocation(monocolourProgram, "u_halfWindowSize")!;
   monocolourZoomUniformLocation = gl.getUniformLocation(monocolourProgram, "u_zoom")!;
}

type GroupedParticles = Array<Array<TexturedParticle>>;

const numParticleTypes = Object.keys(PARTICLE_INFO).length;

const groupParticles = (particles: ReadonlyArray<TexturedParticle>): GroupedParticles => {
   const groupedParticles: GroupedParticles = [];

   // Fill array initially with all particle types as empty
   for (let i = 0; i < numParticleTypes; i++) {
      groupedParticles.push([]);
   }

   for (const particle of particles) {
      groupedParticles[PARTICLE_TEXTURE_MAPPINGS[particle.textureSource]].push(particle);
   }

   return groupedParticles;
}

const calculateParticleRenderPosition = (particle: Particle): Point => {
   let renderPosition = particle.position.copy();
   
   // Account for frame progress
   if (particle.velocity !== null) {
      // 
      // Calculate the change in position that has occurred since the start of the frame
      // 
      let frameVelocity: Vector | null = particle.velocity.copy();
      
      // Accelerate
      if (particle.acceleration !== null) {
         const acceleration = particle.acceleration.copy();
         acceleration.magnitude *= 1 / SETTINGS.TPS;

         // Add acceleration to velocity
         if (frameVelocity !== null) {
            frameVelocity.add(acceleration);
         } else {
            frameVelocity = acceleration;
         }
      }

      // Apply the frame velocity to the object's position
      if (frameVelocity !== null) {
         frameVelocity.magnitude *= getFrameProgress() / SETTINGS.TPS;

         const offset = frameVelocity.convertToPoint();
         renderPosition.add(offset);
      }
   }

   return renderPosition;
}

export function renderMonocolourParticles(particles: ReadonlyArray<MonocolourParticle>): void {
   const vertexCount = particles.length * 6 * 6;
   
   // Create vertices
   const vertexData = new Float32Array(vertexCount);
   for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
         
      const width = particle.width * particle.scale;
      const height = particle.height * particle.scale;

      const renderPosition = calculateParticleRenderPosition(particle);

      const x1 = renderPosition.x - width / 2;
      const x2 = renderPosition.x + width / 2;
      const y1 = renderPosition.y - height / 2;
      const y2 = renderPosition.y + height / 2;

      const topLeftX = rotateXAroundPoint(x1, y2, renderPosition.x, renderPosition.y, particle.rotation);
      const topLeftY = rotateYAroundPoint(x1, y2, renderPosition.x, renderPosition.y, particle.rotation);
      const topRightX = rotateXAroundPoint(x2, y2, renderPosition.x, renderPosition.y, particle.rotation);
      const topRightY = rotateYAroundPoint(x2, y2, renderPosition.x, renderPosition.y, particle.rotation);
      const bottomLeftX = rotateXAroundPoint(x1, y1, renderPosition.x, renderPosition.y, particle.rotation);
      const bottomLeftY = rotateYAroundPoint(x1, y1, renderPosition.x, renderPosition.y, particle.rotation);
      const bottomRightX = rotateXAroundPoint(x2, y1, renderPosition.x, renderPosition.y, particle.rotation);
      const bottomRightY = rotateYAroundPoint(x2, y1, renderPosition.x, renderPosition.y, particle.rotation);

      // Update opacity
      let opacity = particle.opacity;
      if (typeof particle.getOpacity !== "undefined") {
         opacity = particle.getOpacity(particle.age);
      }

      vertexData[i * 6 * 6] = bottomLeftX;
      vertexData[i * 6 * 6 + 1] = bottomLeftY;
      vertexData[i * 6 * 6 + 2] = opacity;
      vertexData[i * 6 * 6 + 3] = particle.colour[0];
      vertexData[i * 6 * 6 + 4] = particle.colour[1];
      vertexData[i * 6 * 6 + 5] = particle.colour[2];

      vertexData[i * 6 * 6 + 6] = bottomRightX;
      vertexData[i * 6 * 6 + 7] = bottomRightY;
      vertexData[i * 6 * 6 + 8] = opacity;
      vertexData[i * 6 * 6 + 9] = particle.colour[0];
      vertexData[i * 6 * 6 + 10] = particle.colour[1];
      vertexData[i * 6 * 6 + 11] = particle.colour[2];

      vertexData[i * 6 * 6 + 12] = topLeftX;
      vertexData[i * 6 * 6 + 13] = topLeftY;
      vertexData[i * 6 * 6 + 14] = opacity;
      vertexData[i * 6 * 6 + 15] = particle.colour[0];
      vertexData[i * 6 * 6 + 16] = particle.colour[1];
      vertexData[i * 6 * 6 + 17] = particle.colour[2];

      vertexData[i * 6 * 6 + 18] = topLeftX;
      vertexData[i * 6 * 6 + 19] = topLeftY;
      vertexData[i * 6 * 6 + 20] = opacity;
      vertexData[i * 6 * 6 + 21] = particle.colour[0];
      vertexData[i * 6 * 6 + 22] = particle.colour[1];
      vertexData[i * 6 * 6 + 23] = particle.colour[2];

      vertexData[i * 6 * 6 + 24] = bottomRightX;
      vertexData[i * 6 * 6 + 25] = bottomRightY;
      vertexData[i * 6 * 6 + 26] = opacity;
      vertexData[i * 6 * 6 + 27] = particle.colour[0];
      vertexData[i * 6 * 6 + 28] = particle.colour[1];
      vertexData[i * 6 * 6 + 29] = particle.colour[2];

      vertexData[i * 6 * 6 + 30] = topRightX;
      vertexData[i * 6 * 6 + 31] = topRightY;
      vertexData[i * 6 * 6 + 32] = opacity;
      vertexData[i * 6 * 6 + 33] = particle.colour[0];
      vertexData[i * 6 * 6 + 34] = particle.colour[1];
      vertexData[i * 6 * 6 + 35] = particle.colour[2];
   }

   gl.useProgram(monocolourProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Create buffer
   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

   // Enable the attributes
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   gl.uniform2f(monocolourPlayerPositionUniformLocation, Camera.position.x, Camera.position.y);
   gl.uniform2f(monocolourHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
   gl.uniform1f(monocolourZoomUniformLocation, Camera.zoom);

   // Draw the vertices
   gl.drawArrays(gl.TRIANGLES, 0, vertexCount / 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

export function renderTexturedParticles(particles: ReadonlyArray<TexturedParticle>): void {
   const groupedParticles = groupParticles(particles);

   // Create vertices
   const textureSources = new Array<string>();
   const vertexDatas = new Array<Float32Array>();
   const vertexCounts = new Array<number>();
   for (let textureMappingIdx = 0; textureMappingIdx < numParticleTypes; textureMappingIdx++) {
      const currentParticles = groupedParticles[textureMappingIdx];
      if (currentParticles.length === 0) {
         continue;
      }

      const textureSource = currentParticles[0].textureSource;
      textureSources.push(textureSource);
      vertexCounts.push(currentParticles.length * 6 * 8);

      const vertexData = new Float32Array(currentParticles.length * 6 * 8);
      for (let i = 0; i < currentParticles.length; i++) {
         const particle = currentParticles[i];
         
         const width = particle.width * particle.scale;
         const height = particle.height * particle.scale;

         const renderPosition = calculateParticleRenderPosition(particle);

         const x1 = renderPosition.x - width / 2;
         const x2 = renderPosition.x + width / 2;
         const y1 = renderPosition.y - height / 2;
         const y2 = renderPosition.y + height / 2;

         const topLeftX = rotateXAroundPoint(x1, y2, renderPosition.x, renderPosition.y, particle.rotation);
         const topLeftY = rotateYAroundPoint(x1, y2, renderPosition.x, renderPosition.y, particle.rotation);
         const topRightX = rotateXAroundPoint(x2, y2, renderPosition.x, renderPosition.y, particle.rotation);
         const topRightY = rotateYAroundPoint(x2, y2, renderPosition.x, renderPosition.y, particle.rotation);
         const bottomLeftX = rotateXAroundPoint(x1, y1, renderPosition.x, renderPosition.y, particle.rotation);
         const bottomLeftY = rotateYAroundPoint(x1, y1, renderPosition.x, renderPosition.y, particle.rotation);
         const bottomRightX = rotateXAroundPoint(x2, y1, renderPosition.x, renderPosition.y, particle.rotation);
         const bottomRightY = rotateYAroundPoint(x2, y1, renderPosition.x, renderPosition.y, particle.rotation);

         // Update opacity
         let opacity = particle.opacity;
         if (typeof particle.getOpacity !== "undefined") {
            opacity = particle.getOpacity(particle.age);
         }
         
         // TODO: Surely there is a less awful way of doing this?
         vertexData[i * 6 * 8] = bottomLeftX;
         vertexData[i * 6 * 8 + 1] = bottomLeftY;
         vertexData[i * 6 * 8 + 2] = 0;
         vertexData[i * 6 * 8 + 3] = 0;
         vertexData[i * 6 * 8 + 4] = opacity;
         vertexData[i * 6 * 8 + 5] = particle.tint[0];
         vertexData[i * 6 * 8 + 6] = particle.tint[1];
         vertexData[i * 6 * 8 + 7] = particle.tint[2];

         vertexData[i * 6 * 8 + 8] = bottomRightX;
         vertexData[i * 6 * 8 + 9] = bottomRightY;
         vertexData[i * 6 * 8 + 10] = 1;
         vertexData[i * 6 * 8 + 11] = 0;
         vertexData[i * 6 * 8 + 12] = opacity;
         vertexData[i * 6 * 8 + 13] = particle.tint[0];
         vertexData[i * 6 * 8 + 14] = particle.tint[1];
         vertexData[i * 6 * 8 + 15] = particle.tint[2];

         vertexData[i * 6 * 8 + 16] = topLeftX;
         vertexData[i * 6 * 8 + 17] = topLeftY;
         vertexData[i * 6 * 8 + 18] = 0;
         vertexData[i * 6 * 8 + 19] = 1;
         vertexData[i * 6 * 8 + 20] = opacity;
         vertexData[i * 6 * 8 + 21] = particle.tint[0];
         vertexData[i * 6 * 8 + 22] = particle.tint[1];
         vertexData[i * 6 * 8 + 23] = particle.tint[2];

         vertexData[i * 6 * 8 + 24] = topLeftX;
         vertexData[i * 6 * 8 + 25] = topLeftY;
         vertexData[i * 6 * 8 + 26] = 0;
         vertexData[i * 6 * 8 + 27] = 1;
         vertexData[i * 6 * 8 + 28] = opacity;
         vertexData[i * 6 * 8 + 29] = particle.tint[0];
         vertexData[i * 6 * 8 + 30] = particle.tint[1];
         vertexData[i * 6 * 8 + 31] = particle.tint[2];

         vertexData[i * 6 * 8 + 32] = bottomRightX;
         vertexData[i * 6 * 8 + 33] = bottomRightY;
         vertexData[i * 6 * 8 + 34] = 1;
         vertexData[i * 6 * 8 + 35] = 0;
         vertexData[i * 6 * 8 + 36] = opacity;
         vertexData[i * 6 * 8 + 37] = particle.tint[0];
         vertexData[i * 6 * 8 + 38] = particle.tint[1];
         vertexData[i * 6 * 8 + 39] = particle.tint[2];

         vertexData[i * 6 * 8 + 40] = topRightX;
         vertexData[i * 6 * 8 + 41] = topRightY;
         vertexData[i * 6 * 8 + 42] = 1;
         vertexData[i * 6 * 8 + 43] = 1;
         vertexData[i * 6 * 8 + 44] = opacity;
         vertexData[i * 6 * 8 + 45] = particle.tint[0];
         vertexData[i * 6 * 8 + 46] = particle.tint[1];
         vertexData[i * 6 * 8 + 47] = particle.tint[2];
      }
      vertexDatas.push(vertexData);
   }

   gl.useProgram(texturedProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let i = 0; i < textureSources.length; i++) {
      const textureSource = textureSources[i];
      const vertexData = vertexDatas[i];
      const vertexCount = vertexCounts[i];

      // Create buffer
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

      // Enable the attributes
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      gl.enableVertexAttribArray(2);
      gl.enableVertexAttribArray(3);

      gl.uniform2f(texturedPlayerPositionUniformLocation, Camera.position.x, Camera.position.y);
      gl.uniform2f(texturedHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
      gl.uniform1f(texturedZoomUniformLocation, Camera.zoom);
      gl.uniform1i(texturedTextureUniformLocation, 0);

      const texture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Draw the vertices
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount / 8);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}