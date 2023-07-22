import { Point, rotatePoint } from "webgl-test-shared";
import Camera from "../Camera";
import Entity from "../entities/Entity";
import Game from "../Game";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import RenderPart, { RenderObject } from "../render-parts/RenderPart";
import { getTexture } from "../textures";
import { createShaderString, createWebGLProgram, gl, MAX_ACTIVE_TEXTURE_UNITS, windowHeight, windowWidth } from "../webgl";
import GameObject from "../GameObject";

/*
- We only care about the draw orders within an entity, as game objects usually don't overlap.
*/

// 
// Image shaders
// 
const entityRenderingVertexShaderText = `
precision highp float;

attribute vec2 a_position;
attribute float a_redness;
attribute vec2 a_texCoord;
attribute float a_textureIdx;

varying vec2 v_texCoord;
varying float v_redness;
varying float v_textureIdx;
 
void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
   v_textureIdx = a_textureIdx;
   v_redness = a_redness;
}
`;

let entityRenderingFragmentShaderText: string;
createShaderString(`
precision highp float;

uniform sampler2D u_textures[__MAX_ACTIVE_TEXTURE_UNITS__];

varying vec2 v_texCoord;
varying float v_redness;
varying float v_textureIdx;
    
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

   fragColour.r = fragColour.r * (1.0 - v_redness) + 1.0 * v_redness;
   fragColour.g = fragColour.g * (1.0 - v_redness);
   fragColour.b = fragColour.b * (1.0 - v_redness);
   gl_FragColor = fragColour;
}
`, (shaderString: string) => {
   entityRenderingFragmentShaderText = shaderString
});

let imageRenderingProgram: WebGLProgram;

let imageRenderingProgramTexturesUniformLocation: WebGLUniformLocation;
let imageRenderingProgramPosAttribLocation: GLint;
let imageRenderingProgramRednessAttribLocation: GLint;
let imageRenderingProgramTexCoordAttribLocation: GLint;
let imageRenderingProgramTextureIdxAttribLocation: GLint;

export function createEntityShaders(): void {
   imageRenderingProgram = createWebGLProgram(entityRenderingVertexShaderText, entityRenderingFragmentShaderText);

   imageRenderingProgramTexturesUniformLocation = gl.getUniformLocation(imageRenderingProgram, "u_textures")!;
   imageRenderingProgramPosAttribLocation = gl.getAttribLocation(imageRenderingProgram, "a_position");
   imageRenderingProgramRednessAttribLocation = gl.getAttribLocation(imageRenderingProgram, "a_redness");
   imageRenderingProgramTexCoordAttribLocation = gl.getAttribLocation(imageRenderingProgram, "a_texCoord");
   imageRenderingProgramTextureIdxAttribLocation = gl.getAttribLocation(imageRenderingProgram, "a_textureIdx");
}

/**
 * Calculates all game objects which are visible to the screen to increase efficiency
 * NOTE: Not perfectly accurate sometimes game objects which are just not visible to the screen are rendered
*/
export function calculateVisibleGameObjects(): Set<GameObject> {
   const visibleGameObjects = new Set<GameObject>();

   const visibleChunkBounds = Camera.getVisibleChunkBounds();

   for (let chunkX = visibleChunkBounds[0]; chunkX <= visibleChunkBounds[1]; chunkX++) {
      for (let chunkY = visibleChunkBounds[2]; chunkY <= visibleChunkBounds[3]; chunkY++) {
         const chunk = Game.board.getChunk(chunkX, chunkY);
         for (const gameObject of chunk.getGameObjects()) {
            const screenXPos = Camera.calculateXScreenPos(gameObject.renderPosition.x);
            const screenYPos = Camera.calculateYScreenPos(gameObject.renderPosition.y);
            
            for (const hitbox of gameObject.hitboxes) {
               switch (hitbox.info.type) {
                  case "circular": {
                     if (!(screenXPos + hitbox.info.radius < 0 ||
                        screenXPos - hitbox.info.radius >= windowWidth ||
                        screenYPos + hitbox.info.radius < 0 ||
                        screenYPos - hitbox.info.radius >= windowHeight)) {
                        visibleGameObjects.add(gameObject);
                     }
                     
                     break;
                  }
                  case "rectangular": {
                     const halfDiagonalLength = (hitbox as RectangularHitbox).halfDiagonalLength;
                     if (screenXPos >= -halfDiagonalLength && 
                     screenXPos < windowWidth + halfDiagonalLength &&
                     screenYPos >= -halfDiagonalLength &&
                     screenYPos < windowHeight + halfDiagonalLength) {
                        visibleGameObjects.add(gameObject);
                     }
                     break;
                  }
               } 
            }
         }
      }
   }

   return visibleGameObjects;
}

const calculateRenderPartVertexPositions = (renderPart: RenderPart, totalRotation: number): [tl: Point, tr: Point, bl: Point, br: Point] => {
   let topLeft = new Point(renderPart.renderPosition.x - renderPart.width / 2, renderPart.renderPosition.y + renderPart.height / 2);
   let topRight = new Point(renderPart.renderPosition.x + renderPart.width / 2, renderPart.renderPosition.y + renderPart.height / 2);
   let bottomLeft = new Point(renderPart.renderPosition.x - renderPart.width / 2, renderPart.renderPosition.y - renderPart.height / 2);
   let bottomRight = new Point(renderPart.renderPosition.x + renderPart.width / 2, renderPart.renderPosition.y - renderPart.height / 2);
   
   // Rotate the corners into position
   topLeft = rotatePoint(topLeft, renderPart.renderPosition, totalRotation);
   topRight = rotatePoint(topRight, renderPart.renderPosition, totalRotation);
   bottomLeft = rotatePoint(bottomLeft, renderPart.renderPosition, totalRotation);
   bottomRight = rotatePoint(bottomRight, renderPart.renderPosition, totalRotation);

   // Convert the corners to screen space
   topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
   topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
   bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));
   bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));

   return [topLeft, topRight, bottomLeft, bottomRight];
}

interface RenderInfo {
   readonly renderPart: RenderPart;
   readonly totalRotation: number;
}

interface CategorisedRenderParts {
   [zIndex: number]: {
      [textureSource: string]: Array<RenderInfo>;
   }
}

export function renderGameObjects(): void {
   const visibleGameObjects = calculateVisibleGameObjects();
   if (visibleGameObjects.size === 0) return;

   // Classify all render parts
   const categorisedRenderParts = categoriseGameObjectsByRenderPart(visibleGameObjects);

   renderRenderParts(categorisedRenderParts);
}

/** Sort the render parts based on their textures */
const categoriseGameObjectsByRenderPart = (visibleGameObjects: ReadonlySet<GameObject>): CategorisedRenderParts => {
   const categorisedRenderParts: CategorisedRenderParts = {};

   let totalRotation = 0;

   const addRenderPart = (renderPart: RenderPart): void => {
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

      texturedRenderParts[renderPart.textureSource].push({
         renderPart: renderPart,
         totalRotation: totalRotation
      });
      
      // Add any child render parts
      for (const childRenderPart of renderPart.renderParts) {
         addRenderPart(childRenderPart);
      }

      totalRotation -= renderPart.rotation;
   }

   for (const gameObject of visibleGameObjects) {
      gameObject.updateRenderPosition();
      
      totalRotation = gameObject.rotation;
      
      for (const renderPart of gameObject.renderParts) {
         addRenderPart(renderPart);
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
   // Find which z-index layers are being rendered, in ascending order.
   const zIndexes = Object.keys(renderParts).map(zIndex => Number(zIndex)).sort((a, b) => a - b);

   // Calculate vertices
   let numTextureUnitsUsed = 0;
   const vertexArrays = new Array<Array<number>>();
   const textureSources = new Array<string>();
   for (const zIndex of zIndexes) {
      for (const [textureSource, texturedRenderParts] of Object.entries(renderParts[zIndex])) {
         const vertices = new Array<number>();
         const textureIdx = numTextureUnitsUsed % MAX_ACTIVE_TEXTURE_UNITS;
         for (const renderInfo of texturedRenderParts) {
            // Add texture source
            
            // Calculate vertices for all render parts in the record
            let redness = 0;

            // TODO: Remove this hacky bullshit
            let entity: Entity | undefined;
            let nextOneUp: RenderObject = renderInfo.renderPart;
            while (nextOneUp instanceof RenderPart) {
               nextOneUp = nextOneUp.parentRenderObject;
            }
            if (nextOneUp instanceof Entity) {
               entity = nextOneUp;
            }
            if (typeof entity !== "undefined") {
               redness = calculateEntityRedness(entity);
            }

            // Calculate the corner positions of the render part
            const [tl, tr, bl, br] = calculateRenderPartVertexPositions(renderInfo.renderPart, renderInfo.totalRotation);
            vertices.push(
               bl.x, bl.y, 0, 0, redness, textureIdx,
               br.x, br.y, 1, 0, redness, textureIdx,
               tl.x, tl.y, 0, 1, redness, textureIdx,
               tl.x, tl.y, 0, 1, redness, textureIdx,
               br.x, br.y, 1, 0, redness, textureIdx,
               tr.x, tr.y, 1, 1, redness, textureIdx
            );
         }
         
         vertexArrays.push(vertices);
         textureSources.push(textureSource);
         numTextureUnitsUsed++;
      }
   }

   gl.useProgram(imageRenderingProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let currentDrawCall = 0; currentDrawCall < Math.ceil(numTextureUnitsUsed / MAX_ACTIVE_TEXTURE_UNITS); currentDrawCall++) {
      let vertices = new Array<number>();
      const usedTextureSources = new Array<string>();
      for (let idx = currentDrawCall * MAX_ACTIVE_TEXTURE_UNITS; idx <= Math.min((currentDrawCall + 1) * MAX_ACTIVE_TEXTURE_UNITS - 1, numTextureUnitsUsed - 1); idx++) {
         vertices = vertices.concat(vertexArrays[idx]);
         usedTextureSources.push(textureSources[idx]);
      }
      
      // Create tile buffer
      const tileBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      gl.vertexAttribPointer(imageRenderingProgramPosAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(imageRenderingProgramTexCoordAttribLocation, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(imageRenderingProgramRednessAttribLocation, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(imageRenderingProgramTextureIdxAttribLocation, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

      gl.uniform1iv(imageRenderingProgramTexturesUniformLocation, usedTextureSources.map((_, idx) => idx));
      
      // Enable the attributes
      gl.enableVertexAttribArray(imageRenderingProgramPosAttribLocation);
      gl.enableVertexAttribArray(imageRenderingProgramTexCoordAttribLocation);
      gl.enableVertexAttribArray(imageRenderingProgramRednessAttribLocation);
      gl.enableVertexAttribArray(imageRenderingProgramTextureIdxAttribLocation);
      
      // Set all texture units
      for (let i = 0; i < usedTextureSources.length; i++) {
         const textureSource = usedTextureSources[i];
         const texture = getTexture(textureSource);
         gl.activeTexture(gl.TEXTURE0 + i);
         gl.bindTexture(gl.TEXTURE_2D, texture);
      }

      // Draw the vertices
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}