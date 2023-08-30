import { Point, lerp } from "webgl-test-shared";
import Camera from "../Camera";
import Entity from "../entities/Entity";
import Game from "../Game";
import RenderPart, { RenderObject } from "../render-parts/RenderPart";
import { getTexture } from "../textures";
import { createShaderString, createWebGLProgram, gl, MAX_ACTIVE_TEXTURE_UNITS } from "../webgl";
import GameObject from "../GameObject";

/*
- We only care about the draw orders within an entity, as game objects usually don't overlap.
*/

const vertexShaderText = `
precision highp float;

attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute vec3 a_tint;
attribute float a_textureIdx;
attribute float a_opacity;

varying vec2 v_texCoord;
varying vec3 v_tint;
varying float v_textureIdx;
varying float v_opacity;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_textureIdx = a_textureIdx;
   v_tint = a_tint;
   v_opacity = a_opacity;
}
`;

let entityRenderingFragmentShaderText: string;
createShaderString(`
precision highp float;

uniform sampler2D u_textures[__MAX_ACTIVE_TEXTURE_UNITS__];

varying vec2 v_texCoord;
varying vec3 v_tint;
varying float v_textureIdx;
varying float v_opacity;
    
vec4 getSampleFromArray(sampler2D textures[__MAX_ACTIVE_TEXTURE_UNITS__], int ndx, vec2 uv) {
   vec4 color = vec4(0);
   for (int i = 0; i < __MAX_ACTIVE_TEXTURE_UNITS__; i++) {
      vec4 c = texture2D(u_textures[i], uv);
      if (i == ndx) {
         color += c;
      }
   }
   return color;
}

void main() {
   vec4 fragColour = getSampleFromArray(u_textures, int(v_textureIdx + 0.5), v_texCoord);
   
   if (v_tint.r > 0.0) {
      fragColour.r = mix(fragColour.r, 1.0, v_tint.r);
   } else {
      fragColour.r = mix(fragColour.r, 0.0, -v_tint.r);
   }
   if (v_tint.g > 0.0) {
      fragColour.g = mix(fragColour.g, 1.0, v_tint.g);
   } else {
      fragColour.g = mix(fragColour.g, 0.0, -v_tint.g);
   }
   if (v_tint.b > 0.0) {
      fragColour.b = mix(fragColour.b, 1.0, v_tint.b);
   } else {
      fragColour.b = mix(fragColour.b, 0.0, -v_tint.b);
   }

   fragColour.a *= v_opacity;

   gl_FragColor = fragColour;
}
`, (shaderString: string) => {
   entityRenderingFragmentShaderText = shaderString
});

let imageRenderingProgram: WebGLProgram;

let imageRenderingProgramTexturesUniformLocation: WebGLUniformLocation;

let imageRenderingProgramTintAttribLocation: GLint;
let imageRenderingProgramTexCoordAttribLocation: GLint;
let imageRenderingProgramTextureIdxAttribLocation: GLint;
let imageRenderingProgramOpacityAttribLocation: GLint;

export function createEntityShaders(): void {
   imageRenderingProgram = createWebGLProgram(vertexShaderText, entityRenderingFragmentShaderText);

   imageRenderingProgramTexturesUniformLocation = gl.getUniformLocation(imageRenderingProgram, "u_textures")!;

   gl.bindAttribLocation(imageRenderingProgram, 0, "a_position");
   imageRenderingProgramTintAttribLocation = gl.getAttribLocation(imageRenderingProgram, "a_tint");
   imageRenderingProgramTexCoordAttribLocation = gl.getAttribLocation(imageRenderingProgram, "a_texCoord");
   imageRenderingProgramTextureIdxAttribLocation = gl.getAttribLocation(imageRenderingProgram, "a_textureIdx");
   imageRenderingProgramOpacityAttribLocation = gl.getAttribLocation(imageRenderingProgram, "a_opacity");
}

export function calculateVisibleGameObjects(): Array<GameObject> {
   const visibleGameObjects = new Array<GameObject>();

   for (const gameObject of Object.values(Game.board.gameObjects)) {
      visibleGameObjects.push(gameObject);
   }

   return visibleGameObjects;
}

// TODO: These functions should be renamed and probably (?) put into the Camera class

export function calculateVertexPositionX(vertexPositionX: number, vertexPositionY: number, renderPartPosition: Point, totalRotation: number): number {
   // Rotate the x position around the render part position
   const rotatedX = Math.cos(totalRotation) * (vertexPositionX - renderPartPosition.x) + Math.sin(totalRotation) * (vertexPositionY - renderPartPosition.y) + renderPartPosition.x
   
   // Convert to canvas position
   return Camera.calculateXCanvasPosition(rotatedX);
}

export function calculateVertexPositionY (vertexPositionX: number, vertexPositionY: number, renderPartPosition: Point, totalRotation: number): number {
   // Rotate the y position around the render part position
   const rotatedY = -Math.sin(totalRotation) * (vertexPositionX - renderPartPosition.x) + Math.cos(totalRotation) * (vertexPositionY - renderPartPosition.y) + renderPartPosition.y

   // Convert to canvas position
   return Camera.calculateYCanvasPosition(rotatedY);
}

interface RenderInfo {
   readonly renderPart: RenderPart;
   readonly totalRotation: number;
   /** The root render object associated with the render part */
   readonly baseRenderObject: RenderObject;
}

interface TexturedRenderParts {
   [textureSource: string]: Array<RenderInfo>;
}

interface CategorisedRenderParts {
   [zIndex: number]: TexturedRenderParts;
}

export function renderGameObjects(gameObjects: ReadonlyArray<GameObject>): void {
   if (gameObjects.length === 0) return;

   // Classify all render parts
   const categorisedRenderParts = categoriseGameObjectsByRenderPart(gameObjects);

   renderRenderParts(categorisedRenderParts);
}

/** Sort the render parts based on their textures */
const categoriseGameObjectsByRenderPart = (visibleGameObjects: ReadonlyArray<GameObject>): CategorisedRenderParts => {
   const categorisedRenderParts: CategorisedRenderParts = {};

   let totalRotation = 0;

   const addRenderPart = (baseRenderObject: RenderObject, renderPart: RenderPart): void => {
      // Don't render inactive render parts
      if (!renderPart.isActive) {
         return;
      }
      
      // Calculate the render position for the object
      renderPart.updateRenderPosition();

      if (!categorisedRenderParts.hasOwnProperty(renderPart.zIndex)) {
         categorisedRenderParts[renderPart.zIndex] = {};
      }

      const texturedRenderParts = categorisedRenderParts[renderPart.zIndex];
      if (!texturedRenderParts.hasOwnProperty(renderPart.textureSource)) {
         texturedRenderParts[renderPart.textureSource] = new Array<RenderInfo>();
      }

      totalRotation += renderPart.rotation;

      const renderPartRotation = renderPart.inheritParentRotation ? totalRotation : renderPart.rotation;
      texturedRenderParts[renderPart.textureSource].push({
         renderPart: renderPart,
         totalRotation: renderPartRotation,
         baseRenderObject: baseRenderObject
      });
      
      // Add any child render parts
      for (const childRenderPart of renderPart.renderParts) {
         addRenderPart(baseRenderObject, childRenderPart);
      }

      totalRotation -= renderPart.rotation;
   }

   for (const gameObject of visibleGameObjects) {
      gameObject.updateRenderPosition();
      
      totalRotation = gameObject.rotation;
      
      for (const renderPart of gameObject.renderParts) {
         addRenderPart(gameObject, renderPart);
      }
   }

   return categorisedRenderParts;
}

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

/** Calculates how red the entity should be if in an attack */
const calculateEntityRedness = (entity: Entity): number => {
   if (entity.secondsSinceLastHit === null || entity.secondsSinceLastHit > ATTACK_HIT_FLASH_DURATION) return 0;

   return MAX_REDNESS * (1 - entity.secondsSinceLastHit / ATTACK_HIT_FLASH_DURATION);
}

const renderRenderParts = (renderParts: CategorisedRenderParts): void => {
   // Calculate how many render parts will be in each draw call
   let numTextureUnitsUsed = 0;
   let partCounter = 0;
   const numPartsPerDrawCall = new Array<number>();
   for (const zIndexRenderInfo of Object.values(renderParts) as ReadonlyArray<TexturedRenderParts>) {
      for (const texturedRenderParts of Object.values(zIndexRenderInfo)) {
         partCounter += texturedRenderParts.length;
         if (numTextureUnitsUsed % MAX_ACTIVE_TEXTURE_UNITS === MAX_ACTIVE_TEXTURE_UNITS - 1) {
            numPartsPerDrawCall.push(partCounter);
            partCounter = 0;
         }
         numTextureUnitsUsed++;
      }
   }
   if (partCounter > 0) {
      numPartsPerDrawCall.push(partCounter);
   }
   
   // Calculate vertices
   numTextureUnitsUsed = 0;
   let partIndex = 0;
   const vertexDatas = new Array<Float32Array>();
   const textureSources = new Array<string>();
   for (const zIndexRenderPartInfo of Object.values(renderParts) as ReadonlyArray<TexturedRenderParts>) {
      for (const [textureSource, texturedRenderParts] of Object.entries(zIndexRenderPartInfo)) {
         if (numTextureUnitsUsed % MAX_ACTIVE_TEXTURE_UNITS === 0) {
            const idx = Math.floor(numTextureUnitsUsed / MAX_ACTIVE_TEXTURE_UNITS);
            const numPartsInDrawCall = numPartsPerDrawCall[idx];
            vertexDatas.push(new Float32Array(numPartsInDrawCall * 6 * 9));
            partIndex = 0;
         }
         
         const textureIdx = numTextureUnitsUsed % MAX_ACTIVE_TEXTURE_UNITS;
         for (const renderInfo of texturedRenderParts) {
            let redTint = 0;
            let greenTint = 0;
            let blueTint = 0;

            // TODO: This shouldn't be here, and shouldn't be hardcoded
            if (renderInfo.baseRenderObject instanceof Entity) {
               if (renderInfo.baseRenderObject.statusEffects.includes("freezing")) {
                  blueTint += 0.5;
                  redTint -= 0.15;
               }

               const redness = calculateEntityRedness(renderInfo.baseRenderObject);
               redTint = lerp(redTint, 1, redness);
               greenTint = lerp(greenTint, -1, redness);
               blueTint = lerp(blueTint, -1, redness);
            }

            const u0 = renderInfo.renderPart.flipX ? 1 : 0;
            const u1 = 1 - u0;

            const x1 = renderInfo.renderPart.renderPosition.x - renderInfo.renderPart.width / 2;
            const x2 = renderInfo.renderPart.renderPosition.x + renderInfo.renderPart.width / 2;
            const y1 = renderInfo.renderPart.renderPosition.y - renderInfo.renderPart.height / 2;
            const y2 = renderInfo.renderPart.renderPosition.y + renderInfo.renderPart.height / 2;

            const topLeftX = calculateVertexPositionX(x1, y2, renderInfo.renderPart.renderPosition, renderInfo.totalRotation);
            const topLeftY = calculateVertexPositionY(x1, y2, renderInfo.renderPart.renderPosition, renderInfo.totalRotation);
            const topRightX = calculateVertexPositionX(x2, y2, renderInfo.renderPart.renderPosition, renderInfo.totalRotation);
            const topRightY = calculateVertexPositionY(x2, y2, renderInfo.renderPart.renderPosition, renderInfo.totalRotation);
            const bottomLeftX = calculateVertexPositionX(x1, y1, renderInfo.renderPart.renderPosition, renderInfo.totalRotation);
            const bottomLeftY = calculateVertexPositionY(x1, y1, renderInfo.renderPart.renderPosition, renderInfo.totalRotation);
            const bottomRightX = calculateVertexPositionX(x2, y1, renderInfo.renderPart.renderPosition, renderInfo.totalRotation);
            const bottomRightY = calculateVertexPositionY(x2, y1, renderInfo.renderPart.renderPosition, renderInfo.totalRotation);

            const data = vertexDatas[vertexDatas.length - 1];

            // TODO: Find better way to do this
            data[partIndex * 6 * 9] = bottomLeftX;
            data[partIndex * 6 * 9 + 1] = bottomLeftY;
            data[partIndex * 6 * 9 + 2] = u0;
            data[partIndex * 6 * 9 + 3] = 0;
            data[partIndex * 6 * 9 + 4] = redTint;
            data[partIndex * 6 * 9 + 5] = greenTint;
            data[partIndex * 6 * 9 + 6] = blueTint;
            data[partIndex * 6 * 9 + 7] = textureIdx;
            data[partIndex * 6 * 9 + 8] = renderInfo.renderPart.opacity;

            data[partIndex * 6 * 9 + 9] = bottomRightX;
            data[partIndex * 6 * 9 + 10] = bottomRightY;
            data[partIndex * 6 * 9 + 11] = u1;
            data[partIndex * 6 * 9 + 12] = 0;
            data[partIndex * 6 * 9 + 13] = redTint;
            data[partIndex * 6 * 9 + 14] = greenTint;
            data[partIndex * 6 * 9 + 15] = blueTint;
            data[partIndex * 6 * 9 + 16] = textureIdx;
            data[partIndex * 6 * 9 + 17] = renderInfo.renderPart.opacity;

            data[partIndex * 6 * 9 + 18] = topLeftX;
            data[partIndex * 6 * 9 + 19] = topLeftY;
            data[partIndex * 6 * 9 + 20] = u0;
            data[partIndex * 6 * 9 + 21] = 1;
            data[partIndex * 6 * 9 + 22] = redTint;
            data[partIndex * 6 * 9 + 23] = greenTint;
            data[partIndex * 6 * 9 + 24] = blueTint;
            data[partIndex * 6 * 9 + 25] = textureIdx;
            data[partIndex * 6 * 9 + 26] = renderInfo.renderPart.opacity;

            data[partIndex * 6 * 9 + 27] = topLeftX;
            data[partIndex * 6 * 9 + 28] = topLeftY;
            data[partIndex * 6 * 9 + 29] = u0;
            data[partIndex * 6 * 9 + 30] = 1;
            data[partIndex * 6 * 9 + 31] = redTint;
            data[partIndex * 6 * 9 + 32] = greenTint;
            data[partIndex * 6 * 9 + 33] = blueTint;
            data[partIndex * 6 * 9 + 34] = textureIdx;
            data[partIndex * 6 * 9 + 35] = renderInfo.renderPart.opacity;

            data[partIndex * 6 * 9 + 36] = bottomRightX;
            data[partIndex * 6 * 9 + 37] = bottomRightY;
            data[partIndex * 6 * 9 + 38] = u1;
            data[partIndex * 6 * 9 + 39] = 0;
            data[partIndex * 6 * 9 + 40] = redTint;
            data[partIndex * 6 * 9 + 41] = greenTint;
            data[partIndex * 6 * 9 + 42] = blueTint;
            data[partIndex * 6 * 9 + 43] = textureIdx;
            data[partIndex * 6 * 9 + 44] = renderInfo.renderPart.opacity;

            data[partIndex * 6 * 9 + 45] = topRightX;
            data[partIndex * 6 * 9 + 46] = topRightY;
            data[partIndex * 6 * 9 + 47] = u1;
            data[partIndex * 6 * 9 + 48] = 1;
            data[partIndex * 6 * 9 + 49] = redTint;
            data[partIndex * 6 * 9 + 50] = greenTint;
            data[partIndex * 6 * 9 + 51] = blueTint;
            data[partIndex * 6 * 9 + 52] = textureIdx;
            data[partIndex * 6 * 9 + 53] = renderInfo.renderPart.opacity;

            partIndex++;
         }
         
         textureSources.push(textureSource);
         numTextureUnitsUsed++;
      }
   }

   gl.useProgram(imageRenderingProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let currentDrawCall = 0; currentDrawCall < vertexDatas.length; currentDrawCall++) {
      const vertexData = vertexDatas[currentDrawCall];
      const vertexCount = numPartsPerDrawCall[currentDrawCall] * 6;

      const usedTextureSources = new Array<string>();
      for (let idx = currentDrawCall * MAX_ACTIVE_TEXTURE_UNITS; idx <= Math.min((currentDrawCall + 1) * MAX_ACTIVE_TEXTURE_UNITS - 1, textureSources.length - 1); idx++) {
         usedTextureSources.push(textureSources[idx]);
      }
      
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(imageRenderingProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(imageRenderingProgramTintAttribLocation, 3, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(imageRenderingProgramTextureIdxAttribLocation, 1, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(imageRenderingProgramOpacityAttribLocation, 1, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);

      gl.uniform1iv(imageRenderingProgramTexturesUniformLocation, usedTextureSources.map((_, idx) => idx));
      
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(imageRenderingProgramTexCoordAttribLocation);
      gl.enableVertexAttribArray(imageRenderingProgramTintAttribLocation);
      gl.enableVertexAttribArray(imageRenderingProgramTextureIdxAttribLocation);
      gl.enableVertexAttribArray(imageRenderingProgramOpacityAttribLocation);
      
      // Set all texture units
      for (let i = 0; i < usedTextureSources.length; i++) {
         const textureSource = usedTextureSources[i];
         const texture = getTexture(textureSource);
         gl.activeTexture(gl.TEXTURE0 + i);
         gl.bindTexture(gl.TEXTURE_2D, texture);
      }

      // Draw the vertices
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}