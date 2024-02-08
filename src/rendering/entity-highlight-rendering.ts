import { EntityType, Point, rotateXAroundOrigin, rotateXAroundPoint, rotateYAroundOrigin, rotateYAroundPoint } from "webgl-test-shared";
import Board from "../Board";
import { getHighlightedEntityID, getSelectedEntityID } from "../entity-selection";
import { createWebGLProgram, gl, CAMERA_UNIFORM_BUFFER_BINDING_INDEX, TIME_UNIFORM_BUFFER_BINDING_INDEX, CIRCLE_VERTEX_COUNT } from "../webgl";
import GameObject from "../GameObject";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y } from "../entities/Ballista";

// @Incomplete: render circular instead of rectangular for barrels and tribesmen

const THICKNESS = 4;

const HIGHLIGHTABLE_STRUCTURE_WIDTHS: Partial<Record<EntityType, number>> = {
   [EntityType.woodenWall]: 64,
   [EntityType.woodenDoor]: 64,
   [EntityType.researchBench]: 32 * 4,
   [EntityType.barrel]: 80,
   [EntityType.tribeWorker]: 56,
   [EntityType.tribeWarrior]: 64,
   [EntityType.campfire]: 90,
   [EntityType.furnace]: 80,
   [EntityType.ballista]: 44
};

const HIGHLIGHTABLE_STRUCTURE_HEIGHTS: Partial<Record<EntityType, number>> = {
   [EntityType.woodenWall]: 64,
   [EntityType.woodenDoor]: 24,
   [EntityType.researchBench]: 20 * 4,
   [EntityType.barrel]: 80,
   [EntityType.tribeWorker]: 56,
   [EntityType.tribeWarrior]: 64,
   [EntityType.campfire]: 90,
   [EntityType.furnace]: 80,
   [EntityType.ballista]: 36
};

const HIGHLIGHTABLE_ENTITY_IS_CIRCLE: Partial<Record<EntityType, boolean>> = {
   [EntityType.woodenWall]: false,
   [EntityType.woodenDoor]: false,
   [EntityType.researchBench]: false,
   [EntityType.barrel]: true,
   [EntityType.tribeWorker]: true,
   [EntityType.tribeWarrior]: true,
   [EntityType.campfire]: true,
   [EntityType.furnace]: false,
   [EntityType.ballista]: false
};

const HIGHLIGHTABLE_STRUCTURE_OFFSETS_X: Partial<Record<EntityType, number>> = {
   [EntityType.woodenWall]: 0,
   [EntityType.woodenDoor]: 0,
   [EntityType.researchBench]: 0,
   [EntityType.barrel]: 0,
   [EntityType.tribeWorker]: 0,
   [EntityType.tribeWarrior]: 0,
   [EntityType.campfire]: 0,
   [EntityType.furnace]: 0,
   [EntityType.ballista]: BALLISTA_AMMO_BOX_OFFSET_X
};

const HIGHLIGHTABLE_STRUCTURE_OFFSETS_Y: Partial<Record<EntityType, number>> = {
   [EntityType.woodenWall]: 0,
   [EntityType.woodenDoor]: 0,
   [EntityType.researchBench]: 0,
   [EntityType.barrel]: 0,
   [EntityType.tribeWorker]: 0,
   [EntityType.tribeWarrior]: 0,
   [EntityType.campfire]: 0,
   [EntityType.furnace]: 0,
   [EntityType.ballista]: BALLISTA_AMMO_BOX_OFFSET_Y
};

const HIGHLIGHTABLE_STRUCTURE_ROTATIONS: Partial<Record<EntityType, number>> = {
   [EntityType.woodenWall]: 0,
   [EntityType.woodenDoor]: 0,
   [EntityType.researchBench]: 0,
   [EntityType.barrel]: 0,
   [EntityType.tribeWorker]: 0,
   [EntityType.tribeWarrior]: 0,
   [EntityType.campfire]: 0,
   [EntityType.furnace]: 0,
   [EntityType.ballista]: Math.PI / 2
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

const calculateRectVertices = (entity: GameObject): ReadonlyArray<number> => {
   const vertices = new Array<number>();

   const halfWidth = HIGHLIGHTABLE_STRUCTURE_WIDTHS[entity.type]! / 2;
   const halfHeight = HIGHLIGHTABLE_STRUCTURE_HEIGHTS[entity.type]! / 2;

   const offsetX = HIGHLIGHTABLE_STRUCTURE_OFFSETS_X[entity.type]!;
   const offsetY = HIGHLIGHTABLE_STRUCTURE_OFFSETS_Y[entity.type]!;
   
   const x = entity.position.x + rotateXAroundOrigin(offsetX, offsetY, entity.rotation);
   const y = entity.position.y + rotateYAroundOrigin(offsetX, offsetY, entity.rotation);

   const localRotation = HIGHLIGHTABLE_STRUCTURE_ROTATIONS[entity.type]!;

   // Top
   addSideVertices(vertices, x, y, x - halfWidth - THICKNESS, x + halfWidth + THICKNESS, y + halfHeight, y + halfHeight + THICKNESS, entity.rotation + localRotation);
   // Right
   addSideVertices(vertices, x, y, x + halfWidth, x + halfWidth + THICKNESS, y - halfHeight - THICKNESS, y + halfHeight + THICKNESS, entity.rotation + localRotation);
   // Bottom
   addSideVertices(vertices, x, y, x - halfWidth - THICKNESS, x + halfWidth + THICKNESS, y - halfHeight, y - halfHeight - THICKNESS, entity.rotation + localRotation);
   // Left
   addSideVertices(vertices, x, y, x - halfWidth - THICKNESS, x - halfWidth, y - halfHeight - THICKNESS, y + halfHeight + THICKNESS, entity.rotation + localRotation);

   return vertices;
}

const calculateCircleVertices = (entity: GameObject): ReadonlyArray<number> => {
   const radius = HIGHLIGHTABLE_STRUCTURE_WIDTHS[entity.type]! / 2;

   const vertices = new Array<number>();
   const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;
   
   // Add the outer vertices
   for (let i = 0; i < CIRCLE_VERTEX_COUNT; i++) {
      const radians = i * 2 * Math.PI / CIRCLE_VERTEX_COUNT;
      // @Speed: Garbage collection
      
      // Trig shenanigans to get x and y coords
      const bl = Point.fromVectorForm(radius, radians);
      const br = Point.fromVectorForm(radius, radians + step);
      const tl = Point.fromVectorForm(radius + THICKNESS, radians);
      const tr = Point.fromVectorForm(radius + THICKNESS, radians + step);

      bl.add(entity.position);
      br.add(entity.position);
      tl.add(entity.position);
      tr.add(entity.position);

      vertices.push(
         bl.x, bl.y,
         br.x, br.y,
         tl.x, tl.y,
         tl.x, tl.y,
         br.x, br.y,
         tr.x, tr.y
      );
   }

   return vertices;
}

export function renderStructureHighlights(): void {
   const highlightedStructureID = getHighlightedEntityID();
   if (highlightedStructureID === -1 || !Board.entityRecord.hasOwnProperty(highlightedStructureID)) {
      return;
   }

   const highlightedEntity = Board.entityRecord[highlightedStructureID];

   let vertices: ReadonlyArray<number>;
   if (HIGHLIGHTABLE_ENTITY_IS_CIRCLE[highlightedEntity.type]) {
      vertices = calculateCircleVertices(highlightedEntity);
   } else {
      vertices = calculateRectVertices(highlightedEntity);
   }
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.uniform2f(originPositionUniformLocation, highlightedEntity.position.x, highlightedEntity.position.y);

   gl.uniform1f(isSelectedUniformLocation, highlightedStructureID === getSelectedEntityID() ? 1 : 0);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}