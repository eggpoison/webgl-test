import { ParticleType, Point, SETTINGS, Vector, rotatePoint } from "webgl-test-shared";
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
   program = createWebGLProgram(vertexShaderText, fragmentShaderText);
   
   textureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   
   gl.bindAttribLocation(program, 0, "a_position");
   texCoordAttribLocation = gl.getAttribLocation(program, "a_texCoord");
   opacityAttribLocation = gl.getAttribLocation(program, "a_opacity");
   tintAttribLocation = gl.getAttribLocation(program, "a_tint");
}

type CategorisedParticles = Record<string, Array<Particle>>;

const particleIsVisible = (particle: Particle, particleRenderPosition: Point): boolean => {
   const halfMaxDiagonalLength = Math.sqrt(Math.pow(particle.width, 2) + Math.pow(particle.height, 2)) / 2;

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
      if (particle.renderLayer !== renderLayer) continue;

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
   const vertexArrays = new Array<Array<number>>();
   for (const [textureSource, particles] of Object.entries(categorisedParticles)) {
      textureSources.push(textureSource);

      const vertices = new Array<number>();
      for (const particle of particles) {
         const renderPosition = calculateParticleRenderPosition(particle);

         if (particleIsVisible(particle, renderPosition)) {
            const width = particle.width * particle.scale;
            const height = particle.height * particle.scale;
   
            // let topLeft = new Point(renderPosition.x - width/2, renderPosition.y + height/2);
            // let topRight = new Point(renderPosition.x + width/2, renderPosition.y + height/2);
            // let bottomLeft = new Point(renderPosition.x - width/2, renderPosition.y - height/2);
            // let bottomRight = new Point(renderPosition.x + width/2, renderPosition.y - height/2);
            
            // // Rotate the corners into position
            // topLeft = rotatePoint(topLeft, renderPosition, particle.rotation);
            // topRight = rotatePoint(topRight, renderPosition, particle.rotation);
            // bottomLeft = rotatePoint(bottomLeft, renderPosition, particle.rotation);
            // bottomRight = rotatePoint(bottomRight, renderPosition, particle.rotation);
   
            // // Convert the corners to screen space
            // const topLeftX = Camera.calculateXCanvasPosition(topLeft.x);
            // const topLeftY = Camera.calculateYCanvasPosition(topLeft.y);
            // const topRightX = Camera.calculateXCanvasPosition(topRight.x);
            // const topRightY = Camera.calculateYCanvasPosition(topRight.y);
            // const bottomLeftX = Camera.calculateXCanvasPosition(bottomLeft.x);
            // const bottomLeftY = Camera.calculateYCanvasPosition(bottomLeft.y);
            // const bottomRightX = Camera.calculateXCanvasPosition(bottomRight.x);
            // const bottomRightY = Camera.calculateYCanvasPosition(bottomRight.y);

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
            
            vertices.push(
               bottomLeftX, bottomLeftY, 0, 0, particle.opacity, particle.tint[0], particle.tint[1], particle.tint[2],
               bottomRightX, bottomRightY, 1, 0, particle.opacity, particle.tint[0], particle.tint[1], particle.tint[2],
               topLeftX, topLeftY, 0, 1, particle.opacity, particle.tint[0], particle.tint[1], particle.tint[2],
               topLeftX, topLeftY, 0, 1, particle.opacity, particle.tint[0], particle.tint[1], particle.tint[2],
               bottomRightX, bottomRightY, 1, 0, particle.opacity, particle.tint[0], particle.tint[1], particle.tint[2],
               topRightX, topRightY, 1, 1, particle.opacity, particle.tint[0], particle.tint[1], particle.tint[2]
            );
         }
      }
      vertexArrays.push(vertices);
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let i = 0; i < textureSources.length; i++) {
      const textureSource = textureSources[i];
      const vertices = vertexArrays[i];
      if (vertices.length === 0) continue;

      const float32Vertices = new Float32Array(vertices);
      
      // Create buffer
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, float32Vertices, gl.STATIC_DRAW);

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
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 8);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}