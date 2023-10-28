import { ItemType, PlaceableItemType, SETTINGS } from "webgl-test-shared";
import Camera from "../Camera";
import Player, { getPlayerSelectedItem } from "../entities/Player";
import { getTexture } from "../textures";
import { gl, halfWindowWidth, halfWindowHeight, createWebGLProgram } from "../webgl";
import { PLACEABLE_ENTITY_INFO_RECORD, canPlaceItem } from "../player-input";
// import PlaceableItem, { PLACEABLE_ENTITY_INFO_RECORD } from "../items/PlaceableItem";

const vertexShaderText = `#version 300 es
precision mediump float;

uniform float u_zoom;
uniform float u_preTranslation;
uniform vec2 u_playerRotation;
uniform vec2 u_halfWindowSize;

layout(location = 0) in vec2 a_vertWorldPosition;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
   vec2 vertWorldOffsetFromPlayer = a_vertWorldPosition + vec2(0, u_preTranslation);
   vec2 rotationOffset = vec2(
      vertWorldOffsetFromPlayer.x * u_playerRotation.y + vertWorldOffsetFromPlayer.y * u_playerRotation.x,
      vertWorldOffsetFromPlayer.y * u_playerRotation.y - vertWorldOffsetFromPlayer.x * u_playerRotation.x
   );

   rotationOffset *= u_zoom;

   vec2 screenPos = rotationOffset + u_halfWindowSize;
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

let program: WebGLProgram;

let buffer: WebGLBuffer;

/** The item type of the last placeable item to be rendered. */
let previousRenderedPlaceableItemType: ItemType;

let zoomUniformLocation: WebGLUniformLocation;
let programPlayerRotationUniformLocation: WebGLUniformLocation;
let programHalfWindowSizeUniformLocation: WebGLUniformLocation;
let programCanPlaceUniformLocation: WebGLUniformLocation;

export function createPlaceableItemProgram(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   
   zoomUniformLocation = gl.getUniformLocation(program, "u_zoom")!;
   programPlayerRotationUniformLocation = gl.getUniformLocation(program, "u_playerRotation")!;
   programHalfWindowSizeUniformLocation = gl.getUniformLocation(program, "u_halfWindowSize")!;
   programCanPlaceUniformLocation = gl.getUniformLocation(program, "u_canPlace")!;
   
   gl.useProgram(program);

   const programTextureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   gl.uniform1i(programTextureUniformLocation, 0);
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

   // If a new type of placeable entity is being drawn, create a new buffer for it
   if (playerSelectedItem.type !== previousRenderedPlaceableItemType) {
      // Calculate vertex world positions
      const x1 = -placeableEntityInfo.width / 2;
      const x2 = placeableEntityInfo.width / 2;
      const y1 = -placeableEntityInfo.height / 2;
      const y2 = placeableEntityInfo.height / 2;

      const vertices: Array<number> = [
         x1, y1, 0, 0,
         x2, y2, 1, 1,
         x1, y2, 0, 1,
         x1, y1, 0, 0,
         x2, y1, 1, 0,
         x2, y2, 1, 1
      ];

      buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      previousRenderedPlaceableItemType = playerSelectedItem.type;
   } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   }

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   const programPreTranslationUniformLocation = gl.getUniformLocation(program, "u_preTranslation")!;
   gl.uniform1f(programPreTranslationUniformLocation, SETTINGS.ITEM_PLACE_DISTANCE + placeableEntityInfo.placeOffset);
   gl.uniform1f(zoomUniformLocation, Camera.zoom);
   gl.uniform2f(programPlayerRotationUniformLocation, xRotation, yRotation);
   gl.uniform2f(programHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);
   gl.uniform1f(programCanPlaceUniformLocation, canPlaceItem(playerSelectedItem) ? 1 : 0);

   const texture = getTexture("entities/" + placeableEntityInfo.textureSource);
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, texture);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}