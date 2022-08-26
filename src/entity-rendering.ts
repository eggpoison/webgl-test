import { Point, SETTINGS } from "webgl-test-shared";
import { gl } from ".";
import Board from "./Board";
import Camera from "./Camera";
import Entity, { ImageRenderPart } from "./entities/Entity";
import { getTexture } from "./textures";
import { createWebGLProgram, rotatePoint } from "./webgl";

const vertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;
attribute vec2 vertTexCoord;

varying vec2 fragTexCoord;
 
void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);

   fragTexCoord = vertTexCoord;
}
`;
const fragmentShaderText = `
precision mediump float;
 
uniform sampler2D sampler;
 
varying vec2 fragTexCoord;
 
void main() {
   gl_FragColor = texture2D(sampler, fragTexCoord);
}
`;

let entityRenderingProgram: WebGLProgram;

const calculateImageRenderPartVertices = (entity: Entity, renderPart: ImageRenderPart, frameProgress: number): Array<number> => {
   let renderPartDrawPosition = entity.position.copy();
   let entityPosition = entity.position.copy();
      
   // Account for frame progress
   if (entity.velocity !== null) {
      const frameVelocity = entity.velocity.copy();
      frameVelocity.magnitude *= frameProgress / SETTINGS.TPS;
      
      const framePoint = frameVelocity.convertToPoint();
      renderPartDrawPosition = renderPartDrawPosition.add(framePoint);
      entityPosition = entityPosition.add(framePoint);
   }

   // Add the offset
   if (typeof renderPart.offset !== "undefined") {
      let offset: Point;
      if (typeof renderPart.offset === "function") {
         offset = renderPart.offset();
      } else {
         offset = renderPart.offset;
      }

      renderPartDrawPosition = renderPartDrawPosition.add(offset);
   }

   // Calculate the positions of the corners
   let topLeft = new Point(renderPartDrawPosition.x - renderPart.width / 2, renderPartDrawPosition.y + renderPart.height / 2);
   let topRight = new Point(renderPartDrawPosition.x + renderPart.width / 2, renderPartDrawPosition.y + renderPart.height / 2);
   let bottomLeft = new Point(renderPartDrawPosition.x - renderPart.width / 2, renderPartDrawPosition.y - renderPart.height / 2);
   let bottomRight = new Point(renderPartDrawPosition.x + renderPart.width / 2, renderPartDrawPosition.y - renderPart.height / 2);

   // Rotate the corners
   topLeft = rotatePoint(topLeft, entityPosition, entity.rotation);
   topRight = rotatePoint(topRight, entityPosition, entity.rotation);
   bottomLeft = rotatePoint(bottomLeft, entityPosition, entity.rotation);
   bottomRight = rotatePoint(bottomRight, entityPosition, entity.rotation);

   // Convert the corners to screen space
   topLeft = new Point(Camera.getXPositionInScreen(topLeft.x), Camera.getYPositionInScreen(topLeft.y));
   topRight = new Point(Camera.getXPositionInScreen(topRight.x), Camera.getYPositionInScreen(topRight.y));
   bottomLeft = new Point(Camera.getXPositionInScreen(bottomLeft.x), Camera.getYPositionInScreen(bottomLeft.y));
   bottomRight = new Point(Camera.getXPositionInScreen(bottomRight.x), Camera.getYPositionInScreen(bottomRight.y));

   return [
      bottomLeft.x, bottomLeft.y, 0, 0,
      bottomRight.x, bottomRight.y, 1, 0,
      topLeft.x, topLeft.y, 0, 1,
      topLeft.x, topLeft.y, 0, 1,
      bottomRight.x, bottomRight.y, 1, 0,
      topRight.x, topRight.y, 1, 1
   ];
}

export function createEntityShaders(): void {
   entityRenderingProgram = createWebGLProgram(vertexShaderText, fragmentShaderText);
}

export function renderEntities(frameProgress: number): void {
   // Sort the render parts into their textures
   const groupedRenderParts: { [textureSrc: string]: Array<[Entity, ImageRenderPart]> } = {};
   for (const entity of Object.values(Board.entities)) {
      const renderParts = entity.getRenderParts();

      for (const renderPart of renderParts) {
         if (renderPart.type === "image") {
            // Add the render part to the record
            if (!groupedRenderParts.hasOwnProperty(renderPart.textureSrc)) {
               groupedRenderParts[renderPart.textureSrc] = new Array<[Entity, ImageRenderPart]>();
            }
            groupedRenderParts[renderPart.textureSrc].push([entity, renderPart]);
         }
      }
   }

   gl.useProgram(entityRenderingProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (const [textureSrc, entities] of Object.entries(groupedRenderParts)) {
      const vertices = new Array<number>();
      for (const [entity, renderPart] of entities) {
         const renderPartVertices = calculateImageRenderPartVertices(entity, renderPart, frameProgress);

         vertices.push(...renderPartVertices);
      }

      // Create tile buffer
      const tileBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      const positionAttribLocation = gl.getAttribLocation(entityRenderingProgram, "vertPosition");
      const texCoordAttribLocation = gl.getAttribLocation(entityRenderingProgram, "vertTexCoord");
      gl.vertexAttribPointer(
         positionAttribLocation, // Attribute location
         2, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         0 // Offset from the beginning of a single vertex to this attribute
      );
      gl.vertexAttribPointer(
         texCoordAttribLocation, // Attribute location
         2, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
      );
      
      // Enable the attributes
      gl.enableVertexAttribArray(positionAttribLocation);
      gl.enableVertexAttribArray(texCoordAttribLocation);
      
      // Set the texture
      const texture = getTexture(textureSrc);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.activeTexture(gl.TEXTURE0);

      // Draw the tile
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}