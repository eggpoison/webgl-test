import { ItemType, SETTINGS } from "webgl-test-shared";
import Player, { getPlayerSelectedItem } from "../entities/Player";
import { getTexture } from "../textures";
import { createWebGLProgram, gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import Item from "./Item";
import Game from "../Game";

type PlaceableEntityInfo = {
   readonly textureSource: string;
   readonly width: number;
   readonly height: number;
}

const PLACEABLE_ENTITY_INFO_RECORD: Partial<Record<ItemType, PlaceableEntityInfo>> = {
   workbench: {
      textureSource: "workbench/workbench.png",
      width: 80,
      height: 80
   }
};

const placeableEntityVertexShader = `
precision mediump float;

uniform float u_preTranslation;
uniform vec2 u_playerRotation;
uniform vec2 u_halfWindowSize;

attribute vec2 a_vertWorldPosition;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
   vec2 vertWorldOffsetFromPlayer = a_vertWorldPosition + vec2(0, u_preTranslation);
   vec2 rotationOffset = vec2(
      vertWorldOffsetFromPlayer.x * u_playerRotation.y + vertWorldOffsetFromPlayer.y * u_playerRotation.x,
      vertWorldOffsetFromPlayer.y * u_playerRotation.y - vertWorldOffsetFromPlayer.x * u_playerRotation.x
   );

   vec2 screenPos = rotationOffset + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_texCoord = a_texCoord;
}
`;

const placeableEntityFragmentShader = `
precision mediump float;

uniform sampler2D u_texture;

varying vec2 v_texCoord;

void main() {
   vec4 textureColour = texture2D(u_texture, v_texCoord);

   textureColour.a *= 0.5;

   gl_FragColor = textureColour;
}
`;

let program: WebGLProgram;

let buffer: WebGLBuffer;

/** The item type of the last placeable item to be rendered. */
let previousRenderedPlaceableItemType: ItemType;

let programPreTranslationUniformLocation: WebGLUniformLocation;
let programPlayerRotationUniformLocation: WebGLUniformLocation;
let programHalfWindowSizeUniformLocation: WebGLUniformLocation;
let programTextureUniformLocation: WebGLUniformLocation;
let programVertWorldPositionAttribLocation: number;
let programTexCoordAttribLocation: number;

export function renderGhostPlaceableItem(): void {
   // Don't render a placeable item if there is no placeable item selected
   const playerSelectedItem = getPlayerSelectedItem();
   if (playerSelectedItem === null || !PLACEABLE_ENTITY_INFO_RECORD.hasOwnProperty(playerSelectedItem.type)) return;

   // Don't render if there is no player
   if (Player.instance === null) return;

   const { textureSource, width, height} = PLACEABLE_ENTITY_INFO_RECORD[playerSelectedItem.type]!;

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Calculate rotation
   const xRotation = Math.cos(-Player.instance.rotation + Math.PI / 2);
   const yRotation = Math.sin(-Player.instance.rotation + Math.PI / 2);

   // If a new type of placeable entity is being drawn, create a new buffer for it
   if (playerSelectedItem.type !== previousRenderedPlaceableItemType) {
      // Calculate vertex world positions
      const x1 = -width / 2;
      const x2 = width / 2;
      const y1 = -height / 2;
      const y2 = height / 2;

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
   
   gl.uniform1f(programPreTranslationUniformLocation, SETTINGS.ITEM_PLACE_DISTANCE);
   gl.uniform2f(programPlayerRotationUniformLocation, xRotation, yRotation);
   gl.uniform2f(programHalfWindowSizeUniformLocation, halfWindowWidth, halfWindowHeight);

   gl.uniform1i(programTextureUniformLocation, 0);

   gl.vertexAttribPointer(programVertWorldPositionAttribLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(programTexCoordAttribLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(programVertWorldPositionAttribLocation);
   gl.enableVertexAttribArray(programTexCoordAttribLocation);

   const texture = getTexture("entities/" + textureSource);
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, texture);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

export function createPlaceableItemProgram(): void {
   program = createWebGLProgram(placeableEntityVertexShader, placeableEntityFragmentShader, "a_vertWorldPosition");
   
   programPreTranslationUniformLocation = gl.getUniformLocation(program, "u_preTranslation")!;
   programPlayerRotationUniformLocation = gl.getUniformLocation(program, "u_playerRotation")!;
   programHalfWindowSizeUniformLocation = gl.getUniformLocation(program, "u_halfWindowSize")!;
   programTextureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   programVertWorldPositionAttribLocation = gl.getAttribLocation(program, "a_vertWorldPosition");
   programTexCoordAttribLocation = gl.getAttribLocation(program, "a_texCoord");
}

class PlaceableItem extends Item {
   public onRightMouseButtonDown(): void {
      super.sendUsePacket();

      // If the item would be consumed when used, clear the isPlacingEntity flag
      if (this.count === 1) {
         Game.latencyGameState.playerIsPlacingEntity = false;
      }
   }

   public onRightMouseButtonUp(): void {
      Game.latencyGameState.playerIsPlacingEntity = false;
   }

   protected onSelect(): void {
      Game.latencyGameState.playerIsPlacingEntity = true;
   }

   protected onDeselect(): void {
      Game.latencyGameState.playerIsPlacingEntity = false;
   }
}

export default PlaceableItem;