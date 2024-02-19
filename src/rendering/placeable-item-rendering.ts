import { EntityType, PlaceableItemType, Point, BlueprintBuildingType, rotateXAroundOrigin, rotateXAroundPoint, rotateYAroundOrigin, rotateYAroundPoint, BuildingShapeType } from "webgl-test-shared";
import Player, { getPlayerSelectedItem } from "../entities/Player";
import { gl, createWebGLProgram, CAMERA_UNIFORM_BUFFER_BINDING_INDEX } from "../webgl";
import { PLACEABLE_ENTITY_INFO_RECORD, calculatePlacePosition, calculatePlaceRotation, calculateSnapInfo, canPlaceItem } from "../player-input";
import { ENTITY_TEXTURE_ATLAS, ENTITY_TEXTURE_ATLAS_SIZE, ENTITY_TEXTURE_SLOT_INDEXES, getEntityTextureArrayIndex, getTextureHeight, getTextureWidth } from "../texture-atlases/entity-texture-atlas";
import { getHoveredShapeType } from "../components/game/BlueprintMenu";
import Board from "../Board";
import { getSelectedEntityID } from "../entity-selection";
import GameObject from "../GameObject";
import { ATLAS_SLOT_SIZE } from "../texture-atlases/texture-atlas-stitching";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, BALLISTA_GEAR_X, BALLISTA_GEAR_Y, getBallistaCrossbarTextureSource } from "../entities/Ballista";

interface TextureInfo {
   readonly textureSource: string;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
}

// @Robustness: Should make a PlaceableEntityType type to automatically detect which ones to use
const TEXTURE_INFO_RECORD: Partial<Record<EntityType, ReadonlyArray<TextureInfo>>> = {
   [EntityType.campfire]: [
      {
         textureSource: "entities/campfire/campfire.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.furnace]: [
      {
         textureSource: "entities/furnace/furnace.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.tribeTotem]: [
      {
         textureSource: "entities/tribe-totem/tribe-totem.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.workbench]: [
      {
         textureSource: "entities/workbench/workbench.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.barrel]: [
      {
         textureSource: "entities/barrel/barrel.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.workerHut]: [
      {
         textureSource: "entities/worker-hut/worker-hut.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.warriorHut]: [
      {
         textureSource: "entities/warrior-hut/warrior-hut.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.researchBench]: [
      {
         textureSource: "entities/research-bench/research-bench.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.planterBox]: [
      {
         textureSource: "entities/planter-box/planter-box.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.woodenFloorSpikes]: [
      {
         textureSource: "entities/wooden-floor-spikes/wooden-floor-spikes.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.woodenWallSpikes]: [
      {
         textureSource: "entities/wooden-wall-spikes/wooden-wall-spikes.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.floorPunjiSticks]: [
      {
         textureSource: "entities/floor-punji-sticks/floor-punji-sticks.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.wallPunjiSticks]: [
      {
         textureSource: "entities/wall-punji-sticks/wall-punji-sticks.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.woodenDoor]: [
      {
         textureSource: "entities/wooden-door/wooden-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.woodenEmbrasure]: [
      {
         textureSource: "entities/wooden-embrasure/wooden-embrasure.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.woodenWall]: [
      {
         textureSource: "entities/wooden-wall/wooden-wall.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [EntityType.ballista]: [
      // Base
      {
         textureSource: "entities/ballista/base.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      },
      // Left gear
      {
         textureSource: "entities/ballista/gear.png",
         offsetX: BALLISTA_GEAR_X,
         offsetY: BALLISTA_GEAR_Y,
         rotation: 0
      },
      // Right gear
      {
         textureSource: "entities/ballista/gear.png",
         offsetX: -BALLISTA_GEAR_X,
         offsetY: BALLISTA_GEAR_Y,
         rotation: 0
      },
      // Ammo box
      {
         textureSource: "entities/ballista/ammo-box.png",
         offsetX: BALLISTA_AMMO_BOX_OFFSET_X,
         offsetY: BALLISTA_AMMO_BOX_OFFSET_Y,
         rotation: Math.PI / 2
      },
      // Shaft
      {
         textureSource: "entities/ballista/shaft.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      },
      // Crossbow
      {
         textureSource: getBallistaCrossbarTextureSource(0),
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      },
   ],
   [EntityType.slingTurret]: [
      // Base
      {
         textureSource: "entities/sling-turret/sling-turret-base.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      },
      // Plate
      {
         textureSource: "entities/sling-turret/sling-turret-plate.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      },
      // Sling
      {
         textureSource: "entities/sling-turret/sling-turret-sling.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      },
   ]
};

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
   layout(location = 2) in float a_textureIndex;
   layout(location = 3) in vec2 a_textureSize;
   
   out vec2 v_texCoord;
   out float v_textureIndex;
   out vec2 v_textureSize;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureIndex = a_textureIndex;
      v_textureSize = a_textureSize;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   uniform sampler2D u_textureAtlas;
   uniform float u_atlasPixelSize;
   uniform float u_atlasSlotSize;
   uniform vec3 u_tint;
   
   in vec2 v_texCoord;
   in float v_textureIndex;
   in vec2 v_textureSize;
   
   out vec4 outputColour;
   
   void main() {
      // Calculate the coordinates of the top left corner of the texture
      float textureX = mod(v_textureIndex * u_atlasSlotSize, u_atlasPixelSize);
      float textureY = floor(v_textureIndex * u_atlasSlotSize / u_atlasPixelSize) * u_atlasSlotSize;
      
      // @Incomplete: This is very hacky, the - 0.2 and + 0.1 shenanigans are to prevent texture bleeding but it causes tiny bits of the edge of the textures to get cut off.
      float u = (textureX + v_texCoord.x * (v_textureSize.x - 0.2) + 0.1) / u_atlasPixelSize;
      float v = 1.0 - ((textureY + (1.0 - v_texCoord.y) * (v_textureSize.y - 0.2) + 0.1) / u_atlasPixelSize);
      outputColour = texture(u_textureAtlas, vec2(u, v));

      outputColour.rgb *= u_tint;
      outputColour.a *= 0.5;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
   
   gl.useProgram(program);

   const programTextureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   const atlasPixelSizeUniformLocation = gl.getUniformLocation(program, "u_atlasPixelSize")!;
   const atlasSlotSizeUniformLocation = gl.getUniformLocation(program, "u_atlasSlotSize")!;

   gl.uniform1i(programTextureUniformLocation, 0);
   gl.uniform1f(atlasPixelSizeUniformLocation, ENTITY_TEXTURE_ATLAS_SIZE);
   gl.uniform1f(atlasSlotSizeUniformLocation, ATLAS_SLOT_SIZE);

   tintUniformLocation = gl.getUniformLocation(program, "u_tint")!;
}

const calculateVertices = (placePosition: Point, placeRotation: number, entityType: EntityType): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   // @Temporary
   if (!TEXTURE_INFO_RECORD.hasOwnProperty(entityType)) {
      throw new Error("No texture info entry for entity type " + EntityType[entityType]);
   }
   
   const textureInfoArray = TEXTURE_INFO_RECORD[entityType]!;
   for (let i = 0; i < textureInfoArray.length; i++) {
      const textureInfo = textureInfoArray[i];
   
      // Find texture size
      const textureArrayIndex = getEntityTextureArrayIndex(textureInfo.textureSource);
      const textureWidth = getTextureWidth(textureArrayIndex);
      const textureHeight = getTextureHeight(textureArrayIndex);
      const width = textureWidth * 4;
      const height = textureHeight * 4;
      const slotIndex = ENTITY_TEXTURE_SLOT_INDEXES[textureArrayIndex];
      
      const x = placePosition.x + rotateXAroundOrigin(textureInfo.offsetX, textureInfo.offsetY, placeRotation);
      const y = placePosition.y + rotateYAroundOrigin(textureInfo.offsetX, textureInfo.offsetY, placeRotation);
      
      const x1 = x - width / 2;
      const x2 = x + width / 2;
      const y1 = y - height / 2;
      const y2 = y + height / 2;
   
      const rotation = placeRotation + textureInfo.rotation;
      const tlX = rotateXAroundPoint(x1, y2, x, y, rotation);
      const tlY = rotateYAroundPoint(x1, y2, x, y, rotation);
      const trX = rotateXAroundPoint(x2, y2, x, y, rotation);
      const trY = rotateYAroundPoint(x2, y2, x, y, rotation);
      const blX = rotateXAroundPoint(x1, y1, x, y, rotation);
      const blY = rotateYAroundPoint(x1, y1, x, y, rotation);
      const brX = rotateXAroundPoint(x2, y1, x, y, rotation);
      const brY = rotateYAroundPoint(x2, y1, x, y, rotation);
   
      vertices.push(
         blX, blY, 0, 0, slotIndex, textureWidth, textureHeight,
         brX, brY, 1, 0, slotIndex, textureWidth, textureHeight,
         tlX, tlY, 0, 1, slotIndex, textureWidth, textureHeight,
         tlX, tlY, 0, 1, slotIndex, textureWidth, textureHeight,
         brX, brY, 1, 0, slotIndex, textureWidth, textureHeight,
         trX, trY, 1, 1, slotIndex, textureWidth, textureHeight
      );
   }

   return vertices;
}

const getStructureShapePosition = (existingStructure: GameObject, shapeType: BuildingShapeType, blueprintRotation: number): Point => {
   switch (shapeType) {
      case BlueprintBuildingType.door: {
         return existingStructure.position.copy();
      }
      case BlueprintBuildingType.embrasure: {
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
   readonly entityType: EntityType;
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
         entityType: placeableEntityInfo.entityType,
         tint: canPlace ? [1, 1, 1] : [1.5, 0.5, 0.5]
      };
   }

   // Blueprint ghost
   const hoveredShapeType = getHoveredShapeType();
   if (hoveredShapeType !== -1) {
      const selectedStructureID = getSelectedEntityID();
      const selectedStructure = Board.entityRecord[selectedStructureID];

      const blueprintRotation = snapRotationToPlayer(selectedStructure, selectedStructure.rotation);

      return {
         position: getStructureShapePosition(selectedStructure, hoveredShapeType, blueprintRotation),
         rotation: blueprintRotation,
         entityType: selectedStructure.type,
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

   const vertices = calculateVertices(ghostInfo.position, ghostInfo.rotation, ghostInfo.entityType);

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const buffer = gl.createBuffer()!; // @Speed
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); // @Speed

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   gl.uniform3f(tintUniformLocation, ghostInfo.tint[0], ghostInfo.tint[1], ghostInfo.tint[2]);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, ENTITY_TEXTURE_ATLAS);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 7);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}