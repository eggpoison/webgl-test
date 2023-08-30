import { ParticleType, Point, SETTINGS, Vector } from "webgl-test-shared";
import Game from "../Game";
import { createWebGLProgram, gl } from "../webgl";
import Camera from "../Camera";
import Particle, { ParticleRenderLayer } from "../Particle";
import { getTexture } from "../textures";
import { getFrameProgress } from "../GameObject";
import { calculateVertexPositionX, calculateVertexPositionY } from "./game-object-rendering";

export const PARTICLE_TEXTURES: Record<ParticleType, string> = {
   [ParticleType.bloodPoolSmall]: "particles/blood-pool-small.png",
   [ParticleType.bloodPoolMedium]: "particles/blood-pool-medium.png",
   [ParticleType.bloodPoolLarge]: "particles/blood-pool-large.png",
   [ParticleType.blood]: "particles/blood.png",
   [ParticleType.bloodLarge]: "particles/blood-large.png",
   [ParticleType.cactusSpine]: "particles/cactus-spine.png",
   [ParticleType.dirt]: "particles/dirt.png",
   [ParticleType.leaf]: "particles/leaf.png",
   [ParticleType.rock]: "particles/rock.png",
   [ParticleType.rockLarge]: "particles/rock-large.png",
   [ParticleType.cactusFlower1]: "entities/cactus/cactus-flower-small-1.png",
   [ParticleType.cactusFlower1_2]: "entities/cactus/cactus-flower-large-1.png",
   [ParticleType.cactusFlower2]: "entities/cactus/cactus-flower-small-2.png",
   [ParticleType.cactusFlower2_2]: "entities/cactus/cactus-flower-large-2.png",
   [ParticleType.cactusFlower3]: "entities/cactus/cactus-flower-small-3.png",
   [ParticleType.cactusFlower3_2]: "entities/cactus/cactus-flower-large-3.png",
   [ParticleType.cactusFlower4]: "entities/cactus/cactus-flower-small-4.png",
   [ParticleType.cactusFlower4_2]: "entities/cactus/cactus-flower-large-4.png",
   [ParticleType.cactusFlower5]: "entities/cactus/cactus-flower-5.png",
   [ParticleType.smokeBlack]: "particles/smoke-black.png",
   [ParticleType.smokeWhite]: "particles/smoke-white.png",
   [ParticleType.emberRed]: "particles/ember-red.png",
   [ParticleType.emberOrange]: "particles/ember-orange.png",
   [ParticleType.footprint]: "particles/footprint.png",
   [ParticleType.poisonDroplet]: "particles/poison-droplet.png",
   [ParticleType.slimePuddle]: "particles/slime-puddle.png",
   [ParticleType.waterSplash]: "particles/water-splash.png",
   [ParticleType.waterDroplet]: "particles/water-droplet.png",
   [ParticleType.snow]: "particles/snow.png",
   [ParticleType.wind]: "particles/wind.png",
   [ParticleType.white1x1]: "particles/white1x1.png"
};

const vertexShaderText = `#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
in vec2 a_texCoord;
in float a_opacity;
in vec3 a_tint;

out vec2 v_texCoord;
out float v_opacity;
out vec3 v_tint;

void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_opacity = a_opacity;
   v_tint = a_tint;
}
`;

const fragmentShaderText = `#version 300 es
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

let program: WebGLProgram;

let textureUniformLocation: WebGLUniformLocation;

let texCoordAttribLocation: number;
let opacityAttribLocation: number;
let tintAttribLocation: number;

export function createParticleShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   
   textureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   
   gl.bindAttribLocation(program, 0, "a_position");
   texCoordAttribLocation = gl.getAttribLocation(program, "a_texCoord");
   opacityAttribLocation = gl.getAttribLocation(program, "a_opacity");
   tintAttribLocation = gl.getAttribLocation(program, "a_tint");
}

type CategorisedParticles = Record<string, Array<Particle>>;

const particleIsVisible = (particle: Particle): boolean => {
   const halfMaxDiagonalLength = Math.sqrt(Math.pow(particle.width, 2) + Math.pow(particle.height, 2)) / 2;

   // TODO: The particle render position shouldn't be unnecessarily calculated here, as the positions would be calculated twice if the particle was rendered
   const particleRenderPosition = calculateParticleRenderPosition(particle);
   if (particleRenderPosition.x + halfMaxDiagonalLength < Camera.visiblePositionBounds[0]
      || particleRenderPosition.x - halfMaxDiagonalLength > Camera.visiblePositionBounds[1]
      || particleRenderPosition.y + halfMaxDiagonalLength < Camera.visiblePositionBounds[2]
      || particleRenderPosition.y - halfMaxDiagonalLength > Camera.visiblePositionBounds[3]) {
      return false;
   }
   return true;
}

const categoriseParticles = (renderLayer: ParticleRenderLayer): CategorisedParticles => {
   const categorisedParticles: CategorisedParticles = {};

   for (const particle of Object.values(Game.board.particles)) {
      if (particle.renderLayer !== renderLayer || !particleIsVisible(particle)) continue;

      const textureSource = PARTICLE_TEXTURES[particle.type];
      
      if (!categorisedParticles.hasOwnProperty(textureSource)) {
         categorisedParticles[textureSource] = [];
      }
      categorisedParticles[textureSource].push(particle);
   }

   return categorisedParticles;
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

export function renderParticles(renderLayer: ParticleRenderLayer): void {
   const categorisedParticles = categoriseParticles(renderLayer);

   // Create vertices

   const textureSources = new Array<string>();
   const vertexDatas = new Array<Float32Array>();
   const vertexCounts = new Array<number>();
   for (const [textureSource, particles] of Object.entries(categorisedParticles)) {
      if (particles.length === 0) {
         continue;
      }
      
      textureSources.push(textureSource);
      vertexCounts.push(particles.length * 6 * 8);

      const vertexData = new Float32Array(particles.length * 6 * 8);
      for (let i = 0; i < particles.length; i++) {
         const particle = particles[i];
         
         const renderPosition = calculateParticleRenderPosition(particle);

         const width = particle.width * particle.scale;
         const height = particle.height * particle.scale;

         const x1 = renderPosition.x - width / 2;
         const x2 = renderPosition.x + width / 2;
         const y1 = renderPosition.y - height / 2;
         const y2 = renderPosition.y + height / 2;

         const topLeftX = calculateVertexPositionX(x1, y2, renderPosition, particle.rotation);
         const topLeftY = calculateVertexPositionY(x1, y2, renderPosition, particle.rotation);
         const topRightX = calculateVertexPositionX(x2, y2, renderPosition, particle.rotation);
         const topRightY = calculateVertexPositionY(x2, y2, renderPosition, particle.rotation);
         const bottomLeftX = calculateVertexPositionX(x1, y1, renderPosition, particle.rotation);
         const bottomLeftY = calculateVertexPositionY(x1, y1, renderPosition, particle.rotation);
         const bottomRightX = calculateVertexPositionX(x2, y1, renderPosition, particle.rotation);
         const bottomRightY = calculateVertexPositionY(x2, y1, renderPosition, particle.rotation);
         
         // TODO: Surely there is a less awful way of doing this?
         vertexData[i * 6 * 8] = bottomLeftX;
         vertexData[i * 6 * 8 + 1] = bottomLeftY;
         vertexData[i * 6 * 8 + 2] = 0;
         vertexData[i * 6 * 8 + 3] = 0;
         vertexData[i * 6 * 8 + 4] = particle.opacity;
         vertexData[i * 6 * 8 + 5] = particle.tint[0];
         vertexData[i * 6 * 8 + 6] = particle.tint[1];
         vertexData[i * 6 * 8 + 7] = particle.tint[2];

         vertexData[i * 6 * 8 + 8] = bottomRightX;
         vertexData[i * 6 * 8 + 9] = bottomRightY;
         vertexData[i * 6 * 8 + 10] = 1;
         vertexData[i * 6 * 8 + 11] = 0;
         vertexData[i * 6 * 8 + 12] = particle.opacity;
         vertexData[i * 6 * 8 + 13] = particle.tint[0];
         vertexData[i * 6 * 8 + 14] = particle.tint[1];
         vertexData[i * 6 * 8 + 15] = particle.tint[2];

         vertexData[i * 6 * 8 + 16] = topLeftX;
         vertexData[i * 6 * 8 + 17] = topLeftY;
         vertexData[i * 6 * 8 + 18] = 0;
         vertexData[i * 6 * 8 + 19] = 1;
         vertexData[i * 6 * 8 + 20] = particle.opacity;
         vertexData[i * 6 * 8 + 21] = particle.tint[0];
         vertexData[i * 6 * 8 + 22] = particle.tint[1];
         vertexData[i * 6 * 8 + 23] = particle.tint[2];

         vertexData[i * 6 * 8 + 24] = topLeftX;
         vertexData[i * 6 * 8 + 25] = topLeftY;
         vertexData[i * 6 * 8 + 26] = 0;
         vertexData[i * 6 * 8 + 27] = 1;
         vertexData[i * 6 * 8 + 28] = particle.opacity;
         vertexData[i * 6 * 8 + 29] = particle.tint[0];
         vertexData[i * 6 * 8 + 30] = particle.tint[1];
         vertexData[i * 6 * 8 + 31] = particle.tint[2];

         vertexData[i * 6 * 8 + 32] = bottomRightX;
         vertexData[i * 6 * 8 + 33] = bottomRightY;
         vertexData[i * 6 * 8 + 34] = 1;
         vertexData[i * 6 * 8 + 35] = 0;
         vertexData[i * 6 * 8 + 36] = particle.opacity;
         vertexData[i * 6 * 8 + 37] = particle.tint[0];
         vertexData[i * 6 * 8 + 38] = particle.tint[1];
         vertexData[i * 6 * 8 + 39] = particle.tint[2];

         vertexData[i * 6 * 8 + 40] = topRightX;
         vertexData[i * 6 * 8 + 41] = topRightY;
         vertexData[i * 6 * 8 + 42] = 1;
         vertexData[i * 6 * 8 + 43] = 1;
         vertexData[i * 6 * 8 + 44] = particle.opacity;
         vertexData[i * 6 * 8 + 45] = particle.tint[0];
         vertexData[i * 6 * 8 + 46] = particle.tint[1];
         vertexData[i * 6 * 8 + 47] = particle.tint[2];
      }
      vertexDatas.push(vertexData);
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let i = 0; i < textureSources.length; i++) {
      const textureSource = textureSources[i];
      const vertexData = vertexDatas[i];
      const vertexCount = vertexCounts[i];

      // Create buffer
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(opacityAttribLocation, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(tintAttribLocation, 3, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

      // Enable the attributes
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(texCoordAttribLocation);
      gl.enableVertexAttribArray(opacityAttribLocation);
      gl.enableVertexAttribArray(tintAttribLocation);

      gl.uniform1i(textureUniformLocation, 0);

      const texture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Draw the vertices
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount / 8);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}