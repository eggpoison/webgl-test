import { Point, rotatePoint } from "webgl-test-shared";
import { gl } from ".";
import Board from "./Board";
import Camera from "./Camera";
import CLIENT_SETTINGS from "./client-settings";
import Entity, { CircleRenderPart, ImageRenderPart } from "./entities/Entity";
import Game from "./Game";
import OPTIONS from "./options";
import { getTexture } from "./textures";
import { createWebGLProgram } from "./webgl";

// 
// Image shaders
// 
const entityRenderingVertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;
attribute vec2 vertTexCoord;
attribute float vertRedness;

varying vec2 fragTexCoord;
varying float fragRedness;
 
void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);

   fragTexCoord = vertTexCoord;
   fragRedness = vertRedness;
}
`;
const entityRenderingFragmentShaderText = `
precision mediump float;
 
uniform sampler2D sampler;
 
varying vec2 fragTexCoord;
varying float fragRedness;
 
void main() {
   vec4 pixelVal = texture2D(sampler, fragTexCoord);
   float r = pixelVal.r * (1.0 - fragRedness) + 1.0 * fragRedness;
   float g = pixelVal.g * (1.0 - fragRedness);
   float b = pixelVal.b * (1.0 - fragRedness);
   gl_FragColor = vec4(r, g, b, pixelVal.a);
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

let entityRenderingProgram: WebGLProgram;
let hitboxProgram: WebGLProgram;
let circleProgram: WebGLProgram;

const calculateImageRenderPartVertices = (entity: Entity, renderPart: ImageRenderPart): Array<number> => {
   let renderPartPosition = entity.renderPosition.copy();
   
   // Add the offset
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
   const rotation = -entity.rotation + Math.PI/2;
   topLeft = rotatePoint(topLeft, entity.renderPosition, rotation);
   topRight = rotatePoint(topRight, entity.renderPosition, rotation);
   bottomLeft = rotatePoint(bottomLeft, entity.renderPosition, rotation);
   bottomRight = rotatePoint(bottomRight, entity.renderPosition, rotation);

   // Convert the corners to screen space
   topLeft = new Point(Camera.getXPositionInScreen(topLeft.x), Camera.getYPositionInScreen(topLeft.y));
   topRight = new Point(Camera.getXPositionInScreen(topRight.x), Camera.getYPositionInScreen(topRight.y));
   bottomLeft = new Point(Camera.getXPositionInScreen(bottomLeft.x), Camera.getYPositionInScreen(bottomLeft.y));
   bottomRight = new Point(Camera.getXPositionInScreen(bottomRight.x), Camera.getYPositionInScreen(bottomRight.y));

   const attackInfo = Game.getClientAttack(entity.id);
   let redness: number;
   if (attackInfo !== null) {
      redness = 0.85 * (1 - attackInfo.progress);
   } else {
      redness = 0;
   }

   return [
      bottomLeft.x, bottomLeft.y, 0, 0, redness,
      bottomRight.x, bottomRight.y, 1, 0, redness,
      topLeft.x, topLeft.y, 0, 1, redness,
      topLeft.x, topLeft.y, 0, 1, redness,
      bottomRight.x, bottomRight.y, 1, 0, redness,
      topRight.x, topRight.y, 1, 1, redness
   ];
}

export function createEntityShaders(): void {
   entityRenderingProgram = createWebGLProgram(entityRenderingVertexShaderText, entityRenderingFragmentShaderText);
   hitboxProgram = createWebGLProgram(hitboxVertexShaderText, hitboxFragmentShaderText);
   circleProgram = createWebGLProgram(circleVertexShaderText, circleFragmentShaderText);
}

const calculateCircleVertices = (position: Point, radius: number, rgba: [number, number, number, number]): Array<number> => {
   const triangleVertices = new Array<number>();

   // Add the center point
   const centerX = Camera.getXPositionInScreen(position.x);
   const centerY = Camera.getYPositionInScreen(position.y);
   triangleVertices.push(centerX, centerY, ...rgba);

   // Add the outer vertices
   for (let n = 0; n <= CLIENT_SETTINGS.CIRCLE_DETAIL; n++) {
      const radians = 2 * Math.PI / CLIENT_SETTINGS.CIRCLE_DETAIL * n;

      // Trig shenanigans to get x and y coords
      const worldX = Math.cos(radians) * radius + position.x;
      const worldY = Math.sin(radians) * radius + position.y;
      
      const screenX = Camera.getXPositionInScreen(worldX);
      const screenY = Camera.getYPositionInScreen(worldY);
      
      triangleVertices.push(screenX, screenY, ...rgba);
   }

   return triangleVertices;
}

export function renderEntities(): void {
   // Classify all render parts into their different major features
   const [sortedImageRenderParts, circleRenderParts] = sortEntities();

   renderImageRenderParts(sortedImageRenderParts);
   renderCircleRenderParts(circleRenderParts);
   if (OPTIONS.showEntityHitboxes) {
      renderEntityHitboxes();
   }
}

type SortedImageRenderParts = { [textureSrc: string]: Array<[Entity, ImageRenderPart]> }

/** Sort the render parts into their textures */
const sortEntities = (): [sortedImageRenderParts: SortedImageRenderParts, circleRenderParts: Array<[Entity, CircleRenderPart]>] => {
   const sortedImageRenderParts: SortedImageRenderParts = {};
   const circleRenderParts = new Array<[Entity, CircleRenderPart]>();

   for (const entity of Object.values(Board.entities)) {
      const renderParts = entity.getRenderParts();

      for (const renderPart of renderParts) {
         switch (renderPart.type) {
            case "image": {
               // Add the render part to the record
               if (!sortedImageRenderParts.hasOwnProperty(renderPart.textureSrc)) {
                  sortedImageRenderParts[renderPart.textureSrc] = new Array<[Entity, ImageRenderPart]>();
               }
               sortedImageRenderParts[renderPart.textureSrc].push([entity, renderPart]);
               break;
            }
            case "circle": {
               circleRenderParts.push([entity, renderPart]);
               break;
            }
         }
      }
   }

   return [sortedImageRenderParts, circleRenderParts];
}

/** Calculates the vertices for a collection of image render parts */
const calculateImageRenderPartCollectionVertices = (imageRenderParts: ReadonlyArray<[Entity, ImageRenderPart]>): ReadonlyArray<number> => {
   const vertices = new Array<number>();

   for (const [entity, renderPart] of imageRenderParts) {
      const renderPartVertices = calculateImageRenderPartVertices(entity, renderPart);
      vertices.push(...renderPartVertices);
   }

   return vertices;
}

const renderImageRenderParts = (renderParts: SortedImageRenderParts): void => {
   gl.useProgram(entityRenderingProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (const [textureSrc, imageRenderParts] of Object.entries(renderParts)) {
      const vertices = calculateImageRenderPartCollectionVertices(imageRenderParts);

      // Create tile buffer
      const tileBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      const positionAttribLocation = gl.getAttribLocation(entityRenderingProgram, "vertPosition");
      const texCoordAttribLocation = gl.getAttribLocation(entityRenderingProgram, "vertTexCoord");
      const rednessAttribLocation = gl.getAttribLocation(entityRenderingProgram, "vertRedness");
      gl.vertexAttribPointer(
         positionAttribLocation, // Attribute location
         2, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         0 // Offset from the beginning of a single vertex to this attribute
      );
      gl.vertexAttribPointer(
         texCoordAttribLocation, // Attribute location
         2, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
      );
      gl.vertexAttribPointer(
         rednessAttribLocation, // Attribute location
         1, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         4 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
      );
      
      // Enable the attributes
      gl.enableVertexAttribArray(positionAttribLocation);
      gl.enableVertexAttribArray(texCoordAttribLocation);
      gl.enableVertexAttribArray(rednessAttribLocation);
      
      // Set the texture
      const texture = getTexture("entities/" + textureSrc);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.activeTexture(gl.TEXTURE0);

      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

const renderCircleRenderParts = (circleRenderParts: Array<[Entity, CircleRenderPart]>): void => {
   gl.useProgram(circleProgram);

   // Calculate vertices
   for (const [entity, renderPart] of circleRenderParts) {
      const vertices = calculateCircleVertices(entity.renderPosition, renderPart.radius, renderPart.rgba);

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

const renderEntityHitboxes = (): void => {
   gl.useProgram(hitboxProgram);

   // Calculate vertices
   const vertices = new Array<number>();
   for (const entity of Object.values(Board.entities)) {
      switch (entity.hitbox.type) {
         case "rectangular": {
            const x1 = entity.renderPosition.x - entity.hitbox.width / 2;
            const x2 = entity.renderPosition.x + entity.hitbox.width / 2;
            const y1 = entity.renderPosition.y - entity.hitbox.height / 2;
            const y2 = entity.renderPosition.y + entity.hitbox.height / 2;

            let topLeft = new Point(x1, y2);
            let topRight = new Point(x2, y2);
            let bottomRight = new Point(x2, y1);
            let bottomLeft = new Point(x1, y1);

            // Rotate the points to match the entity's rotation
            const rotation = -entity.rotation + Math.PI/2;
            topLeft = rotatePoint(topLeft, entity.renderPosition, rotation);
            topRight = rotatePoint(topRight, entity.renderPosition, rotation);
            bottomRight = rotatePoint(bottomRight, entity.renderPosition, rotation);
            bottomLeft = rotatePoint(bottomLeft, entity.renderPosition, rotation);

            topLeft = new Point(Camera.getXPositionInScreen(topLeft.x), Camera.getYPositionInScreen(topLeft.y));
            topRight = new Point(Camera.getXPositionInScreen(topRight.x), Camera.getYPositionInScreen(topRight.y));
            bottomRight = new Point(Camera.getXPositionInScreen(bottomRight.x), Camera.getYPositionInScreen(bottomRight.y));
            bottomLeft = new Point(Camera.getXPositionInScreen(bottomLeft.x), Camera.getYPositionInScreen(bottomLeft.y));

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
         
            // Add the outer vertices
            for (let radians = 0, n = 0; n <= CIRCLE_VERTEX_COUNT; radians += step, n++) {
               // Trig shenanigans to get x and y coords
               const worldX = Math.cos(radians) * entity.hitbox.radius + entity.renderPosition.x;
               const worldY = Math.sin(radians) * entity.hitbox.radius + entity.renderPosition.y;
               
               const screenX = Camera.getXPositionInScreen(worldX);
               const screenY = Camera.getYPositionInScreen(worldY);
               
               vertices.push(screenX, screenY);
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