import { EntityType, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import Board from "../Board";
import { getHighlightedStructureID, getSelectedStructureID } from "../structure-selection";
import { createWebGLProgram, gl, CAMERA_UNIFORM_BUFFER_BINDING_INDEX, TIME_UNIFORM_BUFFER_BINDING_INDEX } from "../webgl";

const THICKNESS = 4;

const HIGHLIGHTABLE_STRUCTURE_WIDTHS: Partial<Record<EntityType, number>> = {
   [EntityType.woodenWall]: 64,
   [EntityType.woodenDoor]: 64,
   [EntityType.researchBench]: 32 * 4
};

const HIGHLIGHTABLE_STRUCTURE_HEIGHTS: Partial<Record<EntityType, number>> = {
   [EntityType.woodenWall]: 64,
   [EntityType.woodenDoor]: 16,
   [EntityType.researchBench]: 20 * 4
};

let program: WebGLProgram;

let originPositionUniformLocation: WebGLUniformLocation;
let isSelectedUniformLocation: WebGLUniformLocation;

export function createStructureHighlightShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;

   out vec2 v_position;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0); 

      v_position = a_position;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Time {
      uniform float u_time;
   };

   uniform vec2 u_originPosition;
   uniform float u_isSelected;

   #define PI 3.14159
   
   in vec2 v_position;
   
   out vec4 outputColour;

   float atan2(in float y, in float x) {
      bool s = (abs(x) > abs(y));
      return mix(PI/2.0 - atan(x,y), atan(y,x), s);
   }
   
   void main() {
      if (u_isSelected > 0.5) {
         outputColour = vec4(245.0/255.0, 234.0/255.0, 113.0/255.0, 1.0);
      } else {
         float theta = atan2(v_position.y - u_originPosition.y, v_position.x - u_originPosition.x);
   
         float opacity = sin(theta * 3.0 + u_time * 0.003);
         opacity = mix(0.65, 1.0, opacity);
   
         outputColour = vec4(245.0/255.0, 234.0/255.0, 113.0/255.0, opacity);
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const highlightsTimeBlockIndex = gl.getUniformBlockIndex(program, "Time");
   gl.uniformBlockBinding(program, highlightsTimeBlockIndex, TIME_UNIFORM_BUFFER_BINDING_INDEX);

   originPositionUniformLocation = gl.getUniformLocation(program, "u_originPosition")!;
   isSelectedUniformLocation = gl.getUniformLocation(program, "u_isSelected")!;
}

const addSideVertices = (vertices: Array<number>, centerX: number, centerY: number, x1: number, x2: number, y1: number, y2: number, rotation: number): void => {
   const tlX = rotateXAroundPoint(x1, y2, centerX, centerY, rotation);
   const tlY = rotateYAroundPoint(x1, y2, centerX, centerY, rotation);
   const trX = rotateXAroundPoint(x2, y2, centerX, centerY, rotation);
   const trY = rotateYAroundPoint(x2, y2, centerX, centerY, rotation);
   const blX = rotateXAroundPoint(x1, y1, centerX, centerY, rotation);
   const blY = rotateYAroundPoint(x1, y1, centerX, centerY, rotation);
   const brX = rotateXAroundPoint(x2, y1, centerX, centerY, rotation);
   const brY = rotateYAroundPoint(x2, y1, centerX, centerY, rotation);

   vertices.push(
      blX, blY,
      brX, brY,
      tlX, tlY,
      tlX, tlY,
      brX, brY,
      trX, trY
   );
}

const calculateVertices = (highlightedStructureID: number): ReadonlyArray<number> => {
   const structure = Board.entityRecord[highlightedStructureID];

   const vertices = new Array<number>();

   const halfWidth = HIGHLIGHTABLE_STRUCTURE_WIDTHS[structure.type]! / 2;
   const halfHeight = HIGHLIGHTABLE_STRUCTURE_HEIGHTS[structure.type]! / 2;

   // Top
   addSideVertices(vertices, structure.position.x, structure.position.y, structure.position.x - halfWidth - THICKNESS, structure.position.x + halfWidth + THICKNESS, structure.position.y + halfHeight, structure.position.y + halfHeight + THICKNESS, structure.rotation);
   // Right
   addSideVertices(vertices, structure.position.x, structure.position.y, structure.position.x + halfWidth, structure.position.x + halfWidth + THICKNESS, structure.position.y - halfHeight - THICKNESS, structure.position.y + halfHeight + THICKNESS, structure.rotation);
   // Bottom
   addSideVertices(vertices, structure.position.x, structure.position.y, structure.position.x - halfWidth - THICKNESS, structure.position.x + halfWidth + THICKNESS, structure.position.y - halfHeight, structure.position.y - halfHeight - THICKNESS, structure.rotation);
   // Left
   addSideVertices(vertices, structure.position.x, structure.position.y, structure.position.x - halfWidth - THICKNESS, structure.position.x - halfWidth, structure.position.y - halfHeight - THICKNESS, structure.position.y + halfHeight + THICKNESS, structure.rotation);

   return vertices;
}

export function renderStructureHighlights(): void {
   const highlightedStructureID = getHighlightedStructureID();
   if (highlightedStructureID === -1 || !Board.entityRecord.hasOwnProperty(highlightedStructureID)) {
      return;
   }

   const vertices = calculateVertices(highlightedStructureID);
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   const highlightedEntity = Board.entityRecord[highlightedStructureID];
   gl.uniform2f(originPositionUniformLocation, highlightedEntity.position.x, highlightedEntity.position.y);

   gl.uniform1f(isSelectedUniformLocation, highlightedStructureID === getSelectedStructureID() ? 1 : 0);

   gl.drawArrays(gl.TRIANGLES, 0, 24);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}