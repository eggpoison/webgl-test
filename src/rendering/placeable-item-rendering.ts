import { PlaceableItemType, Point, StructureShapeType, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import Player, { getPlayerSelectedItem } from "../entities/Player";
import { getTexture } from "../textures";
import { gl, createWebGLProgram, CAMERA_UNIFORM_BUFFER_BINDING_INDEX } from "../webgl";
import { PLACEABLE_ENTITY_INFO_RECORD, PLACEABLE_ENTITY_TEXTURE_SOURCES, calculatePlacePosition, calculatePlaceRotation, calculateSnapInfo, canPlaceItem } from "../player-input";
import { getEntityTextureArrayIndex, getTextureHeight, getTextureWidth } from "../texture-atlases/entity-texture-atlas";
import { getHoveredShapeType } from "../components/game/BlueprintMenu";
import Board from "../Board";
import { getSelectedStructureID } from "../structure-selection";
import GameObject from "../GameObject";

export const SHAPE_TYPE_TEXTURE_SOURCES: Record<StructureShapeType, string> = {
   [StructureShapeType.door]: "entities/wooden-door/wooden-door.png",
   [StructureShapeType.embrasure]: "entities/wooden-embrasure/wooden-embrasure.png"
}

let program: WebGLProgram;

let tintUniformLocation: WebGLUniformLocation;

export function createPlaceableItemProgram(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   
   out vec2 v_texCoord;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   uniform sampler2D u_texture;
   uniform vec3 u_tint;
   
   in vec2 v_texCoord;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = texture(u_texture, v_texCoord);

      outputColour.rgb *= u_tint;
      outputColour.a *= 0.5;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
   
   gl.useProgram(program);

   const programTextureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   gl.uniform1i(programTextureUniformLocation, 0);

   tintUniformLocation = gl.getUniformLocation(program, "u_tint")!;
}

const calculateVertices = (placePosition: Point, placeRotation: number, textureSource: string): ReadonlyArray<number> => {
   // Find texture size
   const textureArrayIndex = getEntityTextureArrayIndex(textureSource);
   const width = getTextureWidth(textureArrayIndex) * 4;
   const height = getTextureHeight(textureArrayIndex) * 4;
   
   const x1 = placePosition.x - width / 2;
   const x2 = placePosition.x + width / 2;
   const y1 = placePosition.y - height / 2;
   const y2 = placePosition.y + height / 2;

   const tlX = rotateXAroundPoint(x1, y2, placePosition.x, placePosition.y, placeRotation);
   const tlY = rotateYAroundPoint(x1, y2, placePosition.x, placePosition.y, placeRotation);
   const trX = rotateXAroundPoint(x2, y2, placePosition.x, placePosition.y, placeRotation);
   const trY = rotateYAroundPoint(x2, y2, placePosition.x, placePosition.y, placeRotation);
   const blX = rotateXAroundPoint(x1, y1, placePosition.x, placePosition.y, placeRotation);
   const blY = rotateYAroundPoint(x1, y1, placePosition.x, placePosition.y, placeRotation);
   const brX = rotateXAroundPoint(x2, y1, placePosition.x, placePosition.y, placeRotation);
   const brY = rotateYAroundPoint(x2, y1, placePosition.x, placePosition.y, placeRotation);

   return [
      blX, blY, 0, 0,
      brX, brY, 1, 0,
      tlX, tlY, 0, 1,
      tlX, tlY, 0, 1,
      brX, brY, 1, 0,
      trX, trY, 1, 1
   ];
}

const getStructureShapePosition = (existingStructure: GameObject, shapeType: StructureShapeType, blueprintRotation: number): Point => {
   switch (shapeType) {
      case StructureShapeType.door: {
         return existingStructure.position.copy();
      }
      case StructureShapeType.embrasure: {
         const position = existingStructure.position.copy();
         position.x += 22 * Math.sin(blueprintRotation);
         position.y += 22 * Math.cos(blueprintRotation);
         return position;
      }
   }
}

interface GhostInfo {
   readonly position: Point;
   readonly rotation: number;
   readonly textureSource: string;
   readonly tint: [number, number, number];
}

const snapRotationToPlayer = (structure: GameObject, rotation: number): number => {
   const playerDirection = Player.instance!.position.calculateAngleBetween(structure.position);
   let snapRotation = playerDirection - rotation;

   // Snap to nearest PI/2 interval
   snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

   snapRotation += rotation;
   return snapRotation;
}

const getGhostInfo = (): GhostInfo | null => {
   // Placeable item ghost
   const playerSelectedItem = getPlayerSelectedItem();
   if (playerSelectedItem !== null && PLACEABLE_ENTITY_INFO_RECORD.hasOwnProperty(playerSelectedItem.type)) {
      const placeableEntityInfo = PLACEABLE_ENTITY_INFO_RECORD[playerSelectedItem.type as PlaceableItemType]!;
      
      const snapInfo = calculateSnapInfo(placeableEntityInfo);
      const placePosition = calculatePlacePosition(placeableEntityInfo, snapInfo);
      const placeRotation = calculatePlaceRotation(snapInfo);

      const canPlace = canPlaceItem(placePosition, placeRotation, playerSelectedItem, snapInfo !== null ? snapInfo.entityType : placeableEntityInfo.entityType);

      return {
         position: placePosition,
         rotation: placeRotation,
         textureSource: PLACEABLE_ENTITY_TEXTURE_SOURCES[snapInfo !== null ? snapInfo.entityType : placeableEntityInfo.entityType]!,
         tint: canPlace ? [1, 1, 1] : [1.5, 0.5, 0.5]
      };
   }

   // Blueprint ghost
   const hoveredShapeType = getHoveredShapeType();
   if (hoveredShapeType !== -1) {
      const selectedStructureID = getSelectedStructureID();
      const selectedStructure = Board.entityRecord[selectedStructureID];

      const blueprintRotation = snapRotationToPlayer(selectedStructure, selectedStructure.rotation);

      return {
         position: getStructureShapePosition(selectedStructure, hoveredShapeType, blueprintRotation),
         rotation: blueprintRotation,
         textureSource: SHAPE_TYPE_TEXTURE_SOURCES[hoveredShapeType],
         tint: [1, 1, 1]
      };
   }

   return null;
}

export function renderGhostPlaceableItem(): void {
   if (Player.instance === null) {
      return;
   }

   const ghostInfo = getGhostInfo();
   if (ghostInfo === null) {
      return;
   }

   const vertices = calculateVertices(ghostInfo.position, ghostInfo.rotation, ghostInfo.textureSource);

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.uniform3f(tintUniformLocation, ghostInfo.tint[0], ghostInfo.tint[1], ghostInfo.tint[2]);

   const texture = getTexture(ghostInfo.textureSource);
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, texture);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}