import { ParticleType, Point, SETTINGS, Vector, rotatePoint } from "webgl-test-shared";
import Game from "../Game";
import { createWebGLProgram, gl } from "../webgl";
import Camera from "../Camera";
import Particle, { ParticleRenderLayer } from "../Particle";
import { getTexture } from "../textures";
import { getFrameProgress } from "../GameObject";

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
};

const vertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute float a_opacity;

varying vec2 v_texCoord;
varying float v_opacity;

void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_opacity = a_opacity;
}
`;

const fragmentShaderText = `
precision mediump float;

uniform sampler2D u_texture;

varying vec2 v_texCoord;
varying float v_opacity;

void main() {
   vec4 textureColour = texture2D(u_texture, v_texCoord);

   gl_FragColor = vec4(textureColour.r, textureColour.g, textureColour.b, textureColour.a * v_opacity);
}
`;

let program: WebGLProgram;

let textureUniformLocation: WebGLUniformLocation;
let positionAttribLocation: number;
let texCoordAttribLocation: number;
let opacityAttribLocation: number;

export function createParticleShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText);

   textureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   positionAttribLocation = gl.getAttribLocation(program, "a_position");
   texCoordAttribLocation = gl.getAttribLocation(program, "a_texCoord");
   opacityAttribLocation = gl.getAttribLocation(program, "a_opacity");
}

type CategorisedParticles = Record<string, Array<Particle>>;

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

         const width = particle.width * particle.scale;
         const height = particle.height * particle.scale;

         let topLeft = new Point(renderPosition.x - width/2, renderPosition.y + height/2);
         let topRight = new Point(renderPosition.x + width/2, renderPosition.y + height/2);
         let bottomLeft = new Point(renderPosition.x - width/2, renderPosition.y - height/2);
         let bottomRight = new Point(renderPosition.x + width/2, renderPosition.y - height/2);
         
         // Rotate the corners into position
         topLeft = rotatePoint(topLeft, renderPosition, particle.rotation);
         topRight = rotatePoint(topRight, renderPosition, particle.rotation);
         bottomLeft = rotatePoint(bottomLeft, renderPosition, particle.rotation);
         bottomRight = rotatePoint(bottomRight, renderPosition, particle.rotation);

         // Convert the corners to screen space
         topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
         topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
         bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));
         bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));

         vertices.push(
            bottomLeft.x, bottomLeft.y, 0, 0, particle.opacity,
            bottomRight.x, bottomRight.y, 1, 0, particle.opacity,
            topLeft.x, topLeft.y, 0, 1, particle.opacity,
            topLeft.x, topLeft.y, 0, 1, particle.opacity,
            bottomRight.x, bottomRight.y, 1, 0, particle.opacity,
            topRight.x, topRight.y, 1, 1, particle.opacity
         );
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

      gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(opacityAttribLocation, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);

      // Enable the attributes
      gl.enableVertexAttribArray(positionAttribLocation);
      gl.enableVertexAttribArray(texCoordAttribLocation);
      gl.enableVertexAttribArray(opacityAttribLocation);

      gl.uniform1i(textureUniformLocation, 0);

      const texture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Draw the vertices
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}