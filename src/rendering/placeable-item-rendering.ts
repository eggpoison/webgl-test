import { PlaceableItemType, Point, SETTINGS, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import Camera from "../Camera";
import Player, { getPlayerSelectedItem } from "../entities/Player";
import { getTexture } from "../textures";
import { gl, halfWindowWidth, halfWindowHeight, createWebGLProgram, CAMERA_UNIFORM_BUFFER_BINDING_INDEX } from "../webgl";
import { PLACEABLE_ENTITY_INFO_RECORD, PlaceableEntityInfo, calculatePlacePosition, calculatePlaceRotation, calculateSnapID, canPlaceItem } from "../player-input";

let program: WebGLProgram;

let zoomUniformLocation: WebGLUniformLocation;
let programPlayerRotationUniformLocation: WebGLUniformLocation;
let programHalfWindowSizeUniformLocation: WebGLUniformLocation;
let programCanPlaceUniformLocation: WebGLUniformLocation;

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
   uniform float u_canPlace;
   
   in vec2 v_texCoord;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = texture(u_texture, v_texCoord);
   
      outputColour.a *= 0.5;
   
      if (u_canPlace < 0.5) {
         outputColour.r *= 1.5;
         outputColour.g *= 0.5;
         outputColour.b *= 0.5;
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
   
   gl.useProgram(program);

   const programTextureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   gl.uniform1i(programTextureUniformLocation, 0);

   programCanPlaceUniformLocation = gl.getUniformLocation(program, "u_canPlace")!;
}

const calculateVertices = (placePosition: Point, placeRotation: number, placeableEntityInfo: PlaceableEntityInfo): ReadonlyArray<number> => {
   const x1 = placePosition.x - placeableEntityInfo.width / 2;
   const x2 = placePosition.x + placeableEntityInfo.width / 2;
   const y1 = placePosition.y - placeableEntityInfo.height / 2;
   const y2 = placePosition.y + placeableEntityInfo.height / 2;

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

export function renderGhostPlaceableItem(): void {
   // Don't render a placeable item if there is no placeable item selected
   const playerSelectedItem = getPlayerSelectedItem();
   if (playerSelectedItem === null || !PLACEABLE_ENTITY_INFO_RECORD.hasOwnProperty(playerSelectedItem.type)) return;

   // Don't render if there is no player
   if (Player.instance === null) return;

   const placeableEntityInfo = PLACEABLE_ENTITY_INFO_RECORD[playerSelectedItem.type as PlaceableItemType]!;

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Calculate rotation
   const xRotation = Math.cos(-Player.instance.rotation + Math.PI / 2);
   const yRotation = Math.sin(-Player.instance.rotation + Math.PI / 2);

   const snapInfo = calculateSnapID(placeableEntityInfo);
   const placePosition = calculatePlacePosition(placeableEntityInfo, snapInfo);
   const placeRotation = calculatePlaceRotation(snapInfo);

   const vertices = calculateVertices(placePosition, placeRotation, placeableEntityInfo);
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   const programPreTranslationUniformLocation = gl.getUniformLocation(program, "u_preTranslation")!;
   gl.uniform1f(programPreTranslationUniformLocation, SETTINGS.ITEM_PLACE_DISTANCE + placeableEntityInfo.placeOffset);
   gl.uniform1f(zoomUniformLocation, Camera.zoom);
   gl.uniform2f(programPlayerRotationUniformLocation, xRotation, yRotation);
   gl.uniform2f(programHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
   gl.uniform1f(programCanPlaceUniformLocation, canPlaceItem(placePosition, placeRotation, playerSelectedItem) ? 1 : 0);

   const texture = getTexture("entities/" + placeableEntityInfo.textureSource);
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, texture);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}