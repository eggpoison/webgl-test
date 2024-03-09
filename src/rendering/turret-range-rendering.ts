import { EntityType, ItemType, PlaceableItemType } from "webgl-test-shared";
import { getPlayerSelectedItem } from "../entities/Player";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, TIME_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import { PLACEABLE_ENTITY_INFO_RECORD, calculatePlacePosition, calculatePlaceRotation, calculateSnapInfo } from "../player-input";
import Board from "../Board";
import Entity from "../Entity";
import { getHoveredEntityID } from "../entity-selection";

const CIRCLE_DETAIL = 300;

interface TurretRangeInfo {
   readonly range: number;
   /** Total radians that the turrets' range covers */
   readonly arc: number;
}

interface TurretRangeRenderingInfo {
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
   readonly itemType: ItemType;
   readonly rangeInfo: TurretRangeInfo;
}

const TURRET_RANGE_INFO_RECORD: Partial<Record<ItemType, TurretRangeInfo>> = {
   [ItemType.ballista]: {
      range: 550,
      arc: Math.PI / 2
   },
   [ItemType.sling_turret]: {
      range: 300,
      arc: 2 * Math.PI
   }
};

let program: WebGLProgram;

export function createTurretRangeShaders(): void {
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

   #define INTERVAL 48.0
   #define PIXEL_SIZE 4.0

   uniform vec2 u_placePos;
   uniform float u_range;
   
   layout(std140) uniform Time {
      uniform float u_time;
   };
   
   in vec2 v_position;
   
   out vec4 outputColour;
   
   float roundPixel(float num) {
      return ceil(num / PIXEL_SIZE) * PIXEL_SIZE;
   }
   
   void main() {
      float x = roundPixel(v_position.x);
      float y = roundPixel(v_position.y);

      float time_offset = u_time / 40.0;

      float dist = distance(vec2(x, y), u_placePos) - time_offset;

      float remainder = fract(dist / INTERVAL);
      if (remainder > 0.5) {
         float distPercentage = distance(v_position, u_placePos) / u_range;
         distPercentage = smoothstep(0.0, 1.0, distPercentage);
         outputColour = vec4(0.1, 0.15, 0.95, mix(0.3, 0.45, distPercentage));
      } else {
         outputColour = vec4(0.1, 0.15, 0.95, 0.3);
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const texturedTimeBlockIndex = gl.getUniformBlockIndex(program, "Time");
   gl.uniformBlockBinding(program, texturedTimeBlockIndex, TIME_UNIFORM_BUFFER_BINDING_INDEX);
}

const calculateVertices = (renderingInfo: TurretRangeRenderingInfo): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   const numTrigs = Math.ceil(CIRCLE_DETAIL * renderingInfo.rangeInfo.arc / (2 * Math.PI));
   for (let i = 0; i < numTrigs; i++) {
      const startRadians = i / numTrigs * renderingInfo.rangeInfo.arc + renderingInfo.rotation - renderingInfo.rangeInfo.arc/2;
      const endRadians = (i + 1) / numTrigs * renderingInfo.rangeInfo.arc + renderingInfo.rotation - renderingInfo.rangeInfo.arc/2;

      const startX = renderingInfo.x + renderingInfo.rangeInfo.range * Math.sin(startRadians);
      const startY = renderingInfo.y + renderingInfo.rangeInfo.range * Math.cos(startRadians);
      const endX = renderingInfo.x + renderingInfo.rangeInfo.range * Math.sin(endRadians);
      const endY = renderingInfo.y + renderingInfo.rangeInfo.range * Math.cos(endRadians);
      
      vertices.push(
         renderingInfo.x, renderingInfo.y,
         endX, endY,
         startX, startY
      );
   }

   return vertices;
}

const getTurretItemType = (turret: Entity): ItemType => {
   switch (turret.type) {
      case EntityType.ballista: return ItemType.ballista;
      case EntityType.slingTurret: return ItemType.sling_turret;
      default: throw new Error();
   }
}

const getRenderingInfo = (): TurretRangeRenderingInfo | null => {
   const playerSelectedItem = getPlayerSelectedItem();
   if (playerSelectedItem !== null && (playerSelectedItem.type === ItemType.ballista || playerSelectedItem.type === ItemType.sling_turret)) {
      const placeableEntityInfo = PLACEABLE_ENTITY_INFO_RECORD[playerSelectedItem.type as PlaceableItemType]!;
   
      const snapInfo = calculateSnapInfo(placeableEntityInfo);
      const placePosition = calculatePlacePosition(placeableEntityInfo, snapInfo);
      const placeRotation = calculatePlaceRotation(snapInfo);

      return {
         x: placePosition.x,
         y: placePosition.y,
         rotation: placeRotation,
         itemType: playerSelectedItem.type,
         rangeInfo: TURRET_RANGE_INFO_RECORD[playerSelectedItem.type]!
      }
   }

   const hoveredEntityID = getHoveredEntityID();
   if (hoveredEntityID !== -1) {
      const hoveredEntity = Board.entityRecord[hoveredEntityID];

      if (hoveredEntity.type === EntityType.ballista || hoveredEntity.type === EntityType.slingTurret) {
         const itemType = getTurretItemType(hoveredEntity);
         return {
            x: hoveredEntity.position.x,
            y: hoveredEntity.position.y,
            rotation: hoveredEntity.rotation,
            itemType: itemType,
            rangeInfo: TURRET_RANGE_INFO_RECORD[itemType]!
         }
      }
   }

   return null;
}

export function renderTurretRange(): void {
   const renderingInfo = getRenderingInfo();
   if (renderingInfo === null) {
      return;
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // @Speed: should only be calculated once when the player first selects the item, with the result cached
   const vertices = calculateVertices(renderingInfo);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   const rangeLocation = gl.getUniformLocation(program, "u_range")!;
   gl.uniform1f(rangeLocation, renderingInfo.rangeInfo.range);
   const placePosLocation = gl.getUniformLocation(program, "u_placePos")!;
   gl.uniform2f(placePosLocation, renderingInfo.x, renderingInfo.y);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}