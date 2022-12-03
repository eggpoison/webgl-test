import { Point, rotatePoint } from "webgl-test-shared";
import Camera from "./Camera";
import CLIENT_SETTINGS from "./client-settings";
import Entity from "./entities/Entity";
import Game from "./Game";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import OPTIONS from "./options";
import CircleRenderPart from "./render-parts/CircleRenderPart";
import ImageRenderPart from "./render-parts/ImageRenderPart";
import RenderPart, { RenderPartInfo } from "./render-parts/RenderPart";
import { getTexture } from "./textures";
import { createWebGLProgram, gl, MAX_ACTIVE_TEXTURE_UNITS, windowHeight, windowWidth } from "./webgl";

// 
// Image shaders
// 
const entityRenderingVertexShaderText = `
precision mediump float;

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
const entityRenderingFragmentShaderText = `
#define maxNumTextures ${MAX_ACTIVE_TEXTURE_UNITS}

precision mediump float;

uniform sampler2D u_textures[maxNumTextures];

varying vec2 v_texCoord;
varying float v_redness;
varying float v_textureIdx;
    
vec4 getSampleFromArray(sampler2D textures[maxNumTextures], int ndx, vec2 uv) {
   vec4 color = vec4(0);
   for (int i = 0; i < maxNumTextures; i++) {
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
`;

// 
// Circle shaders
// 
const circleVertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;
attribute vec4 vertColour;

varying vec4 fragColour;

void main() {
   fragColour = vertColour;
   gl_Position = vec4(vertPosition, 0, 1);
}
`;
const circleFragmentShaderText = `
precision mediump float;

varying vec4 fragColour;

void main() {
   gl_FragColor = fragColour;
}
`;

// 
// Hitbox shaders
// 
const hitboxVertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;

void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);   
}
`;
const hitboxFragmentShaderText = `
precision mediump float;

void main() {
   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);   
}
`;

let imageRenderingProgram: WebGLProgram;
let hitboxProgram: WebGLProgram;
let circleProgram: WebGLProgram;

let imageRenderingProgramTexturesUniformLocation: WebGLUniformLocation;
let imageRenderingProgramPosAttribLocation: GLint;
let imageRenderingProgramRednessAttribLocation: GLint;
let imageRenderingProgramTexCoordAttribLocation: GLint;
let imageRenderingProgramTextureIdxAttribLocation: GLint;

export function createEntityShaders(): void {
   imageRenderingProgram = createWebGLProgram(entityRenderingVertexShaderText, entityRenderingFragmentShaderText);
   hitboxProgram = createWebGLProgram(hitboxVertexShaderText, hitboxFragmentShaderText);
   circleProgram = createWebGLProgram(circleVertexShaderText, circleFragmentShaderText);

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
const calculateVisibleEntities = (): ReadonlyArray<Entity> => {
   const visibleEntities = new Array<Entity>();

   for (const entity of Object.values(Game.board.entities)) {
      const screenXPos = Camera.calculateXScreenPos(entity.renderPosition.x);
      const screenYPos = Camera.calculateYScreenPos(entity.renderPosition.y);
      
      switch (entity.hitbox.info.type) {
         case "circular": {
            if (!(screenXPos + entity.hitbox.info.radius < 0 ||
               screenXPos - entity.hitbox.info.radius >= windowWidth ||
               screenYPos + entity.hitbox.info.radius < 0 ||
               screenYPos - entity.hitbox.info.radius >= windowHeight)) {
               visibleEntities.push(entity);
            }
            
            break;
         }
         case "rectangular": {
            if (!(screenXPos + (entity.hitbox as RectangularHitbox).halfDiagonalLength / 2 < 0 ||
               screenXPos - (entity.hitbox as RectangularHitbox).halfDiagonalLength >= windowWidth ||
               screenYPos + (entity.hitbox as RectangularHitbox).halfDiagonalLength < 0 ||
               screenYPos - (entity.hitbox as RectangularHitbox).halfDiagonalLength >= windowHeight)) {
               visibleEntities.push(entity);
            }
            break;
         }
      }
   }

   return visibleEntities;
}

const calculateImageRenderPartCornerPositions = (renderPart: ImageRenderPart): [tl: Point, tr: Point, bl: Point, br: Point] => {
   let renderPartPosition = renderPart.entity.renderPosition.copy();
   
   // Add any offset
   if (typeof renderPart.offset !== "undefined") {
      let offset: Point;
      if (typeof renderPart.offset === "function") {
         offset = renderPart.offset();
      } else {
         offset = renderPart.offset;
      }

      renderPartPosition = renderPartPosition.add(offset);
   }

   // Calculate the positions of the corners
   let topLeft = new Point(renderPartPosition.x - renderPart.width / 2, renderPartPosition.y + renderPart.height / 2);
   let topRight = new Point(renderPartPosition.x + renderPart.width / 2, renderPartPosition.y + renderPart.height / 2);
   let bottomLeft = new Point(renderPartPosition.x - renderPart.width / 2, renderPartPosition.y - renderPart.height / 2);
   let bottomRight = new Point(renderPartPosition.x + renderPart.width / 2, renderPartPosition.y - renderPart.height / 2);
   
   // Rotate the corners
   topLeft = rotatePoint(topLeft, renderPart.entity.renderPosition, renderPart.entity.rotation);
   topRight = rotatePoint(topRight, renderPart.entity.renderPosition, renderPart.entity.rotation);
   bottomLeft = rotatePoint(bottomLeft, renderPart.entity.renderPosition, renderPart.entity.rotation);
   bottomRight = rotatePoint(bottomRight, renderPart.entity.renderPosition, renderPart.entity.rotation);

   // Convert the corners to screen space
   topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
   topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
   bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));
   bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));

   return [topLeft, topRight, bottomLeft, bottomRight];
}

const calculateCircleVertices = (position: Point, radius: number, rgba: [number, number, number, number]): Array<number> => {
   const triangleVertices = new Array<number>();

   // Add the center point
   const centerX = Camera.calculateXCanvasPosition(position.x);
   const centerY = Camera.calculateYCanvasPosition(position.y);
   triangleVertices.push(centerX, centerY, ...rgba);

   // Add the outer vertices
   for (let n = 0; n <= CLIENT_SETTINGS.CIRCLE_DETAIL; n++) {
      const radians = 2 * Math.PI / CLIENT_SETTINGS.CIRCLE_DETAIL * n;

      // Trig shenanigans to get x and y coords
      const worldX = Math.cos(radians) * radius + position.x;
      const worldY = Math.sin(radians) * radius + position.y;
      
      const screenX = Camera.calculateXCanvasPosition(worldX);
      const screenY = Camera.calculateYCanvasPosition(worldY);
      
      triangleVertices.push(screenX, screenY, ...rgba);
   }

   return triangleVertices;
}

type TexturedRenderPartCollection<T extends RenderPart<RenderPartInfo>> = {
   [zIndex: number]: {
      [textureSource: string]: Array<T>;
   }
};
type RenderPartCollection<T extends RenderPart<RenderPartInfo>> = {
   [zIndex: number]: Array<T>;
};
type CategorisedEntityRenderParts = {
   readonly imageRenderParts: TexturedRenderPartCollection<ImageRenderPart>;
   readonly circleRenderParts: RenderPartCollection<CircleRenderPart>;
};

type ImageRenderPartCornerPositions = {
   [entityID: number]: {
      [renderPartIdx: number]: [tl: Point, tr: Point, bl: Point, br: Point];
   }
}

export function renderEntities(): void {
   const visibleEntities = calculateVisibleEntities();

   // Classify all render parts into their different major features
   const categorisedEntities = categoriseEntitiesByRenderPart(visibleEntities);

   // Calculate the corner positions for all image render parts
   const imageRenderPartCornerPositionsRecord: ImageRenderPartCornerPositions = {};
   for (const zIndexedImageRenderPartArray of Object.values(categorisedEntities.imageRenderParts)) {
      const texturedImageRenderPartArray = Object.values(zIndexedImageRenderPartArray);
      for (const imageRenderPartArray of texturedImageRenderPartArray) {
         for (const imageRenderPart of imageRenderPartArray) {
            
            if (!imageRenderPartCornerPositionsRecord.hasOwnProperty(imageRenderPart.entity.id)) {
               imageRenderPartCornerPositionsRecord[imageRenderPart.entity.id] = {};
            }
            
            const cornerPositions = calculateImageRenderPartCornerPositions(imageRenderPart);
            imageRenderPartCornerPositionsRecord[imageRenderPart.entity.id][imageRenderPart.arrayIdx] = cornerPositions;
         }
      }
   }

   renderImageRenderParts(categorisedEntities.imageRenderParts, imageRenderPartCornerPositionsRecord);
   renderCircleRenderParts(categorisedEntities.circleRenderParts);

   if (OPTIONS.showEntityHitboxes) {
      renderEntityHitboxes();
   }
}

/** Sort the render parts into their textures */
const categoriseEntitiesByRenderPart = (visibleEntities: ReadonlyArray<Entity>): CategorisedEntityRenderParts => {
   const categorisedEntities: CategorisedEntityRenderParts = {
      imageRenderParts: [],
      circleRenderParts: []
   };

   for (const entity of visibleEntities) {
      for (const renderPart of entity.renderParts) {
         switch (renderPart.type) {
            case "circle": {
               // If the z-index hasn't been created yet
               if (!categorisedEntities.circleRenderParts.hasOwnProperty(renderPart.zIndex)) {
                  categorisedEntities.circleRenderParts[renderPart.zIndex] = new Array<CircleRenderPart>();
               }
      
               categorisedEntities.circleRenderParts[renderPart.zIndex].push(renderPart as CircleRenderPart);
               break;
            }
            case "image": {
               // If the z-index hasn't been created yet
               if (!categorisedEntities.imageRenderParts.hasOwnProperty(renderPart.zIndex)) {
                  categorisedEntities.imageRenderParts[renderPart.zIndex] = {};
               }
      
               // If there isn't a record for the render part's texture yet
               const textureSource = (renderPart as ImageRenderPart).textureSrc;
               if (!categorisedEntities.imageRenderParts[renderPart.zIndex].hasOwnProperty(textureSource)) {
                  categorisedEntities.imageRenderParts[renderPart.zIndex][textureSource] = new Array<ImageRenderPart>();
               }
      
               categorisedEntities.imageRenderParts[renderPart.zIndex][textureSource].push(renderPart as ImageRenderPart);
               break;
            }
         }
      }
   }

   return categorisedEntities;
}

const renderImageRenderParts = (imageRenderParts: TexturedRenderPartCollection<ImageRenderPart>, cornerPositionsRecord: ImageRenderPartCornerPositions): void => {
   // 
   // Calculate vertices
   // 
   let numTextureUnits: number = 0;
   const renderPartArrays = new Array<Array<ImageRenderPart>>();
   for (const texturedRenderPartRecord of Object.values(imageRenderParts)) {
      for (const renderPartArray of Object.values(texturedRenderPartRecord)) {
         numTextureUnits++;
         renderPartArrays.push(renderPartArray);
      }
   }

   if (numTextureUnits === 0) return;

   const verticesArray = new Array<Array<number>>();
   const textureSourcesArray = new Array<Array<string>>();

   for (let i = 0; i <= Math.floor(numTextureUnits / MAX_ACTIVE_TEXTURE_UNITS); i++) {
      const vertices = new Array<number>();
      const textureSources = new Array<string>();

      for (let j = i * MAX_ACTIVE_TEXTURE_UNITS; j < Math.min((i + 1) * MAX_ACTIVE_TEXTURE_UNITS, numTextureUnits); j++) {
         const renderParts = renderPartArrays[j];

         // Texture source
         textureSources.push(renderPartArrays[j][0].textureSrc);
         const textureIdx = textureSources.length - 1;

         for (const renderPart of renderParts) {
            // Redness
            const attackInfo = Game.getClientAttack(renderPart.entity.id);
            const redness = attackInfo !== null ? 0.85 * (1 - attackInfo.progress) : 0;

            const [tl, tr, bl, br] = cornerPositionsRecord[renderPart.entity.id][renderPart.arrayIdx];

            vertices.push(
               bl.x, bl.y, 0, 0, redness, textureIdx,
               br.x, br.y, 1, 0, redness, textureIdx,
               tl.x, tl.y, 0, 1, redness, textureIdx,
               tl.x, tl.y, 0, 1, redness, textureIdx,
               br.x, br.y, 1, 0, redness, textureIdx,
               tr.x, tr.y, 1, 1, redness, textureIdx
            );
         }
      }

      verticesArray.push(vertices);
      textureSourcesArray.push(textureSources);
   }
   
   gl.useProgram(imageRenderingProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let i = 0; i < verticesArray.length; i++) {
      const vertices = verticesArray[i];
      const indexedTextureSources = textureSourcesArray[i];

      // Create tile buffer
      const tileBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      gl.vertexAttribPointer(
         imageRenderingProgramPosAttribLocation, // Attribute location
         2, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         0 // Offset from the beginning of a single vertex to this attribute
      );
      gl.vertexAttribPointer(
         imageRenderingProgramTexCoordAttribLocation, // Attribute location
         2, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
      );
      gl.vertexAttribPointer(
         imageRenderingProgramRednessAttribLocation, // Attribute location
         1, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         4 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
      );
      gl.vertexAttribPointer(
         imageRenderingProgramTextureIdxAttribLocation, // Attribute location
         1, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         5 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
      );

      gl.uniform1iv(imageRenderingProgramTexturesUniformLocation, indexedTextureSources.map((_, idx) => idx));
      
      // Enable the attributes
      gl.enableVertexAttribArray(imageRenderingProgramPosAttribLocation);
      gl.enableVertexAttribArray(imageRenderingProgramTexCoordAttribLocation);
      gl.enableVertexAttribArray(imageRenderingProgramRednessAttribLocation);
      gl.enableVertexAttribArray(imageRenderingProgramTextureIdxAttribLocation);
      
      
      // Set all texture units
      for (let i = 0; i < indexedTextureSources.length; i++) {
         const textureSource = indexedTextureSources[i];
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

const renderCircleRenderParts = (renderPartCollection: RenderPartCollection<CircleRenderPart>): void => {
   gl.useProgram(circleProgram);

   // Calculate vertices
   for (const renderPartArray of Object.values(renderPartCollection)) {
      for (const renderPart of renderPartArray) {
         const vertices = calculateCircleVertices(renderPart.entity.renderPosition, renderPart.radius, renderPart.rgba);

         const buffer = gl.createBuffer();
         gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      
         const positionAttribLocation = gl.getAttribLocation(circleProgram, "vertPosition");
         const colourAttribLocation = gl.getAttribLocation(circleProgram, "vertColour");
         
         gl.vertexAttribPointer(
            positionAttribLocation, // Attribute location
            2, // Number of elements per attribute
            gl.FLOAT, // Type of elements
            false,
            6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
            0 // Offset from the beginning of a single vertex to this attribute
         );
         gl.vertexAttribPointer(
            colourAttribLocation, // Attribute location
            4, // Number of elements per attribute
            gl.FLOAT, // Type of elements
            false,
            6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
            2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
         );
      
         // Enable the attributes
         gl.enableVertexAttribArray(positionAttribLocation);
         gl.enableVertexAttribArray(colourAttribLocation);
      
         // Draw the tile
         gl.drawArrays(gl.TRIANGLE_FAN, 0, CLIENT_SETTINGS.CIRCLE_DETAIL + 2);
      }     
   }
}

const renderEntityHitboxes = (): void => {
   gl.useProgram(hitboxProgram);

   // Calculate vertices
   const vertices = new Array<number>();
   for (const entity of Object.values(Game.board.entities)) {
      switch (entity.hitbox.info.type) {
         case "rectangular": {
            const x1 = entity.renderPosition.x - entity.hitbox.info.width / 2;
            const x2 = entity.renderPosition.x + entity.hitbox.info.width / 2;
            const y1 = entity.renderPosition.y - entity.hitbox.info.height / 2;
            const y2 = entity.renderPosition.y + entity.hitbox.info.height / 2;

            let topLeft = new Point(x1, y2);
            let topRight = new Point(x2, y2);
            let bottomRight = new Point(x2, y1);
            let bottomLeft = new Point(x1, y1);

            // Rotate the points to match the entity's rotation
            topLeft = rotatePoint(topLeft, entity.renderPosition, entity.rotation);
            topRight = rotatePoint(topRight, entity.renderPosition, entity.rotation);
            bottomRight = rotatePoint(bottomRight, entity.renderPosition, entity.rotation);
            bottomLeft = rotatePoint(bottomLeft, entity.renderPosition, entity.rotation);

            topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
            topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
            bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));
            bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));

            vertices.push(
               topLeft.x, topLeft.y,
               topRight.x, topRight.y,
               topRight.x, topRight.y,
               bottomRight.x, bottomRight.y,
               bottomRight.x, bottomRight.y,
               bottomLeft.x, bottomLeft.y,
               bottomLeft.x, bottomLeft.y,
               topLeft.x, topLeft.y
            );
            break;
         }
         case "circular": {
            const CIRCLE_VERTEX_COUNT = 10;

            const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;

            let previousX: number;
            let previousY: number;
         
            // Add the outer vertices
            for (let radians = 0, n = 0; n <= CIRCLE_VERTEX_COUNT; radians += step, n++) {
               if (n > 1) {
                  vertices.push(previousX!, previousY!);
               }

               // Trig shenanigans to get x and y coords
               const worldX = Math.cos(radians) * entity.hitbox.info.radius + entity.renderPosition.x;
               const worldY = Math.sin(radians) * entity.hitbox.info.radius + entity.renderPosition.y;
               
               const screenX = Camera.calculateXCanvasPosition(worldX);
               const screenY = Camera.calculateYCanvasPosition(worldY);
               
               vertices.push(screenX, screenY);

               previousX = screenX;
               previousY = screenY;
            }

            break;
         }
      }
   }

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   const positionAttribLocation = gl.getAttribLocation(hitboxProgram, "vertPosition");
   gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(positionAttribLocation);

   gl.drawArrays(gl.LINES, 0, vertices.length / 2);
}