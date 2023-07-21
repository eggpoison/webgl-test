import { EntityType, Point, rotatePoint } from "webgl-test-shared";
import Camera from "../Camera";
import Entity from "../entities/Entity";
import Game from "../Game";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import RenderPart from "../render-parts/RenderPart";
import { getTexture } from "../textures";
import { createShaderString, createWebGLProgram, gl, MAX_ACTIVE_TEXTURE_UNITS, windowHeight, windowWidth } from "../webgl";

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
 * Calculates all entities which are visible to the screen to increase efficiency
 * NOTE: Not perfectly accurate sometimes entities which are just not visible to the screen are rendered
*/
export function calculateVisibleEntities(): Set<Entity> {
   const visibleEntities = new Set<Entity>();

   for (const entity of Object.values(Game.board.entities)) {
      const screenXPos = Camera.calculateXScreenPos(entity.renderPosition.x);
      const screenYPos = Camera.calculateYScreenPos(entity.renderPosition.y);
      
      for (const hitbox of entity.hitboxes) {
         switch (hitbox.info.type) {
            case "circular": {
               if (!(screenXPos + hitbox.info.radius < 0 ||
                  screenXPos - hitbox.info.radius >= windowWidth ||
                  screenYPos + hitbox.info.radius < 0 ||
                  screenYPos - hitbox.info.radius >= windowHeight)) {
                  visibleEntities.add(entity);
               }
               
               break;
            }
            case "rectangular": {
               const halfDiagonalLength = (hitbox as RectangularHitbox).halfDiagonalLength;
               if (screenXPos >= -halfDiagonalLength && 
               screenXPos < windowWidth + halfDiagonalLength &&
               screenYPos >= -halfDiagonalLength &&
               screenYPos < windowHeight + halfDiagonalLength) {
                  visibleEntities.add(entity);
               }
               break;
            }
         } 
      }
   }

   return visibleEntities;
}

const calculateRenderPartCornerPositions = (entity: Entity, renderPart: RenderPart): [tl: Point, tr: Point, bl: Point, br: Point] => {
   let renderPartPosition = entity.renderPosition.copy();
   // let renderPartOffset!: Vector;
   
   // Add any offset
   if (typeof renderPart.offset !== "undefined") {
      let offset: Point;
      if (typeof renderPart.offset === "function") {
         offset = renderPart.offset();
      } else {
         offset = renderPart.offset;
      }
      // renderPartOffset = offset.convertToVector();
      renderPartPosition.add(offset);
   }

   // Calculate the positions of the corners
   let topLeft = new Point(renderPartPosition.x - renderPart.width / 2, renderPartPosition.y + renderPart.height / 2);
   let topRight = new Point(renderPartPosition.x + renderPart.width / 2, renderPartPosition.y + renderPart.height / 2);
   let bottomLeft = new Point(renderPartPosition.x - renderPart.width / 2, renderPartPosition.y - renderPart.height / 2);
   let bottomRight = new Point(renderPartPosition.x + renderPart.width / 2, renderPartPosition.y - renderPart.height / 2);
   
   // Rotate the corners into position
   topLeft = rotatePoint(topLeft, entity.renderPosition, entity.rotation);
   topRight = rotatePoint(topRight, entity.renderPosition, entity.rotation);
   bottomLeft = rotatePoint(bottomLeft, entity.renderPosition, entity.rotation);
   bottomRight = rotatePoint(bottomRight, entity.renderPosition, entity.rotation);
   renderPartPosition = rotatePoint(renderPartPosition, entity.renderPosition, entity.rotation);

   // Render part rotation
   if (typeof renderPart.rotation !== "undefined") {
      topLeft = rotatePoint(topLeft, renderPartPosition, renderPart.rotation);
      topRight = rotatePoint(topRight, renderPartPosition, renderPart.rotation);
      bottomLeft = rotatePoint(bottomLeft, renderPartPosition, renderPart.rotation);
      bottomRight = rotatePoint(bottomRight, renderPartPosition, renderPart.rotation);
   }

   // Convert the corners to screen space
   topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
   topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
   bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));
   bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));

   return [topLeft, topRight, bottomLeft, bottomRight];
}

type ImageRenderPartCornerPositions = Partial<{
   [T in EntityType]: {
      [zIndex: number]: {
         [textureSource: string]: {
            [entityID: number]: [tl: Point, tr: Point, bl: Point, br: Point];
         };
      };
   };
}>;

// BURN IT WITH FIRE
type CategorisedRenderParts = Partial<{
   [T in EntityType]: Array<{
      [textureSource: string]: {
         [entityID: number]: RenderPart;
      };
   }>;
}>;

export function renderEntities(): void {
   // Find visible entities
   const visibleEntities = calculateVisibleEntities();
   if (visibleEntities.size === 0) return;

   // Classify all render parts
   const categorisedRenderParts = categoriseEntitiesByRenderPart(visibleEntities);

   // Four nested for loops... oops
   // Calculate the corner positions for all image render parts
   const imageRenderPartCornerPositionsRecord: ImageRenderPartCornerPositions = {};
   for (const [ entityType, indexedRenderParts ] of Object.entries(categorisedRenderParts)) {
      imageRenderPartCornerPositionsRecord[entityType as EntityType] = {};
      
      for (let zIndex = 0; zIndex < indexedRenderParts.length; zIndex++) {
         imageRenderPartCornerPositionsRecord[entityType as EntityType]![zIndex] = {};

         const textureRecord = indexedRenderParts[zIndex];
         for (const [textureSource, imageRenderParts] of Object.entries(textureRecord)) {
            imageRenderPartCornerPositionsRecord[entityType as EntityType]![zIndex][textureSource] = {};
            
            for (const [entityID, imageRenderPart] of Object.entries(imageRenderParts) as unknown as ReadonlyArray<[number, RenderPart]>) {
               const entity = Game.board.entities[entityID];
               const cornerPositions = calculateRenderPartCornerPositions(entity, imageRenderPart);
               imageRenderPartCornerPositionsRecord[entityType as EntityType]![zIndex][textureSource][entityID] = cornerPositions;
            }
         }
      }
   }

   renderRenderParts(categorisedRenderParts, imageRenderPartCornerPositionsRecord);
}

/** Sort the render parts based on their textures */
const categoriseEntitiesByRenderPart = (visibleEntities: ReadonlySet<Entity>): CategorisedRenderParts => {
   const categorisedRenderParts: CategorisedRenderParts = {};

   for (const entity of visibleEntities) {
      let renderPartIndexInArray = 0;
      for (let idx = 0; idx < entity.renderParts.length; idx++) {
         const renderPart = entity.renderParts[idx];
         
         // If the entity is of a new entity type, add it to the record
         if (!categorisedRenderParts.hasOwnProperty(entity.type)) {
            categorisedRenderParts[entity.type] = new Array<{ [textureSource: string]: Array<RenderPart>; }>();
         }

         const renderParts = categorisedRenderParts[entity.type]!;

         // Create the indexed array element if it isn't present
         if (typeof renderParts[renderPartIndexInArray] === "undefined") {
            renderParts[renderPartIndexInArray] = {};
         }

         // Create the texture source index if it isn't present
         if (!renderParts[renderPartIndexInArray].hasOwnProperty(renderPart.textureSource)) {
            renderParts[renderPartIndexInArray][renderPart.textureSource] = {};
         }

         // Add render part
         renderParts[renderPartIndexInArray][renderPart.textureSource][entity.id] = renderPart;

         renderPartIndexInArray++;
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

const renderRenderParts = (renderParts: CategorisedRenderParts, cornerPositionsRecord: ImageRenderPartCornerPositions): void => {
   // 
   // Calculate vertices
   // 

   let numTextureUnitsUsed = 0;
   const vertexArrays = new Array<Array<number>>();
   const textureSources = new Array<string>();
   for (const [entityType, indexedArray] of Object.entries(renderParts) as ReadonlyArray<[EntityType, Array<{ [textureSource: string]: { [entityID: number]: RenderPart; }; }>]>) {
      for (let zIndex = 0; zIndex < indexedArray.length; zIndex++) {
         const textureRecord = indexedArray[zIndex];
         for (const [textureSource, renderParts] of Object.entries(textureRecord)) {
            // Add texture source
            textureSources.push(textureSource);
            const textureIdx = numTextureUnitsUsed % MAX_ACTIVE_TEXTURE_UNITS;
            
            // Calculate vertices for all render parts in the record
            const vertices = new Array<number>();
            for (const entityID of Object.keys(renderParts) as unknown as ReadonlyArray<number>) {
               const entity = Game.board.entities[entityID];
               
               const redness = calculateEntityRedness(entity);

               // Find the render part's corresponding corner positions
               const [tl, tr, bl, br] = cornerPositionsRecord[entityType]![zIndex][textureSource][entityID];
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
            numTextureUnitsUsed++;
         }
      }
   }

   // 
   // Render vertices
   // 
   
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
         const texture = getTexture("entities/" + textureSource);
         gl.activeTexture(gl.TEXTURE0 + i);
         gl.bindTexture(gl.TEXTURE_2D, texture);
      }

      // Draw the vertices
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}