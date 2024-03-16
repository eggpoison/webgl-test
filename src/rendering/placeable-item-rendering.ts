import { EntityType, PlaceableItemType, Point, ServerComponentType, rotateXAroundOrigin, rotateXAroundPoint, rotateYAroundOrigin, rotateYAroundPoint } from "webgl-test-shared";
import Player, { getPlayerSelectedItem } from "../entities/Player";
import { gl, createWebGLProgram, CAMERA_UNIFORM_BUFFER_BINDING_INDEX } from "../webgl";
import { PLACEABLE_ENTITY_INFO_RECORD, calculatePlacePosition, calculatePlaceRotation, calculateSnapInfo, canPlaceItem } from "../player-input";
import { ENTITY_TEXTURE_ATLAS, ENTITY_TEXTURE_ATLAS_SIZE, ENTITY_TEXTURE_SLOT_INDEXES, getTextureArrayIndex, getTextureHeight, getTextureWidth } from "../texture-atlases/entity-texture-atlas";
import Board from "../Board";
import { getSelectedEntityID } from "../entity-selection";
import Entity from "../Entity";
import { ATLAS_SLOT_SIZE } from "../texture-atlases/texture-atlas-stitching";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, BALLISTA_GEAR_X, BALLISTA_GEAR_Y } from "../utils";
import { getHoveredGhostType } from "../components/game/BlueprintMenu";

const PARTIAL_OPACITY = 0.5;

export enum GhostType {
   deconstructMarker,
   campfire,
   furnace,
   tribeTotem,
   workbench,
   barrel,
   workerHut,
   warriorHut,
   researchBench,
   planterBox,
   woodenSpikes,
   punjiSticks,
   woodenDoor,
   stoneDoor,
   woodenEmbrasure,
   stoneEmbrasure,
   woodenWall,
   stoneWall,
   woodenTunnel,
   stoneTunnel,
   tunnelDoor,
   ballista,
   slingTurret
}

interface GhostInfo {
   readonly position: Point;
   readonly rotation: number;
   readonly ghostType: GhostType;
   readonly isAttachedToWall: boolean;
   readonly tint: [number, number, number];
   readonly opacity: number;
}

interface TextureInfo {
   readonly textureSource: string;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
}

// @Robustness: Should automatically detect which entity types to have an entry for
const ENTITY_TYPE_TO_GHOST_TYPE_MAP: Partial<Record<EntityType, GhostType>> = {
   [EntityType.campfire]: GhostType.campfire,
   [EntityType.furnace]: GhostType.furnace,
   [EntityType.tribeTotem]: GhostType.tribeTotem,
   [EntityType.workbench]: GhostType.workbench,
   [EntityType.barrel]: GhostType.barrel,
   [EntityType.workerHut]: GhostType.workerHut,
   [EntityType.warriorHut]: GhostType.warriorHut,
   [EntityType.researchBench]: GhostType.researchBench,
   [EntityType.planterBox]: GhostType.planterBox,
   [EntityType.woodenSpikes]: GhostType.woodenSpikes,
   [EntityType.punjiSticks]: GhostType.punjiSticks,
   [EntityType.door]: GhostType.woodenDoor,
   [EntityType.embrasure]: GhostType.woodenEmbrasure,
   [EntityType.wall]: GhostType.woodenWall,
   [EntityType.tunnel]: GhostType.woodenTunnel,
   [EntityType.ballista]: GhostType.ballista,
   [EntityType.slingTurret]: GhostType.slingTurret,
};

const TEXTURE_INFO_RECORD: Record<GhostType, ReadonlyArray<TextureInfo>> = {
   [GhostType.deconstructMarker]: [
      {
         textureSource: "entities/deconstruct-marker.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.campfire]: [
      {
         textureSource: "entities/campfire/campfire.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.furnace]: [
      {
         textureSource: "entities/furnace/furnace.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.tribeTotem]: [
      {
         textureSource: "entities/tribe-totem/tribe-totem.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.workbench]: [
      {
         textureSource: "entities/workbench/workbench.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.barrel]: [
      {
         textureSource: "entities/barrel/barrel.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.workerHut]: [
      {
         textureSource: "entities/worker-hut/worker-hut.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.warriorHut]: [
      {
         textureSource: "entities/warrior-hut/warrior-hut.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.researchBench]: [
      {
         textureSource: "entities/research-bench/research-bench.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.planterBox]: [
      {
         textureSource: "entities/planter-box/planter-box.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.woodenSpikes]: [
      {
         textureSource: "entities/wooden-floor-spikes/wooden-floor-spikes.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.punjiSticks]: [
      {
         textureSource: "entities/floor-punji-sticks/floor-punji-sticks.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.woodenDoor]: [
      {
         textureSource: "entities/door/wooden-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.stoneDoor]: [
      {
         textureSource: "entities/door/stone-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.woodenEmbrasure]: [
      {
         textureSource: "entities/embrasure/wooden-embrasure.png",
         offsetX: 0,
         offsetY: 22,
         rotation: 0
      }
   ],
   [GhostType.stoneEmbrasure]: [
      {
         textureSource: "entities/embrasure/stone-embrasure.png",
         offsetX: 0,
         offsetY: 22,
         rotation: 0
      }
   ],
   [GhostType.woodenWall]: [
      {
         textureSource: "entities/wall/wooden-wall.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.stoneWall]: [
      {
         textureSource: "entities/wall/stone-wall.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.woodenTunnel]: [
      {
         textureSource: "entities/tunnel/wooden-tunnel.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.stoneTunnel]: [
      {
         textureSource: "entities/tunnel/stone-tunnel.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      }
   ],
   [GhostType.tunnelDoor]: [
      {
         textureSource: "entities/tunnel/tunnel-door.png",
         offsetX: 0,
         offsetY: 22,
         rotation: 0
      }
   ],
   [GhostType.ballista]: [
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
         textureSource: "entities/ballista/crossbow-1.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0
      },
   ],
   [GhostType.slingTurret]: [
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
      }
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
   layout(location = 4) in float a_opacity;
   
   out vec2 v_texCoord;
   out float v_textureIndex;
   out vec2 v_textureSize;
   out float v_opacity;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureIndex = a_textureIndex;
      v_textureSize = a_textureSize;
      v_opacity = a_opacity;
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
   in float v_opacity;
   
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
      outputColour.a *= v_opacity;
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

const calculateVertices = (placePosition: Point, placeRotation: number, ghostType: GhostType, isAttachedToWall: boolean, opacity: number): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   const textureInfoArray = TEXTURE_INFO_RECORD[ghostType];
   for (let i = 0; i < textureInfoArray.length; i++) {
      const textureInfo = textureInfoArray[i];

      let textureSource: string;
      if (ghostType === GhostType.woodenSpikes) {
         if (isAttachedToWall) {
            textureSource = "entities/wooden-wall-spikes/wooden-wall-spikes.png";
         } else {
            textureSource = "entities/wooden-floor-spikes/wooden-floor-spikes.png";
         }
      } else if (ghostType === GhostType.punjiSticks) {
         if (isAttachedToWall) {
            textureSource = "entities/wall-punji-sticks/wall-punji-sticks.png";
         } else {
            textureSource = "entities/floor-punji-sticks/floor-punji-sticks.png";
         }
      } else {
         textureSource = textureInfo.textureSource;
      }
   
      // Find texture size
      const textureArrayIndex = getTextureArrayIndex(textureSource);
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
   
      const rotation = ghostType !== GhostType.deconstructMarker ? placeRotation + textureInfo.rotation : 0;
      const tlX = rotateXAroundPoint(x1, y2, x, y, rotation);
      const tlY = rotateYAroundPoint(x1, y2, x, y, rotation);
      const trX = rotateXAroundPoint(x2, y2, x, y, rotation);
      const trY = rotateYAroundPoint(x2, y2, x, y, rotation);
      const blX = rotateXAroundPoint(x1, y1, x, y, rotation);
      const blY = rotateYAroundPoint(x1, y1, x, y, rotation);
      const brX = rotateXAroundPoint(x2, y1, x, y, rotation);
      const brY = rotateYAroundPoint(x2, y1, x, y, rotation);
   
      vertices.push(
         blX, blY, 0, 0, slotIndex, textureWidth, textureHeight, opacity,
         brX, brY, 1, 0, slotIndex, textureWidth, textureHeight, opacity,
         tlX, tlY, 0, 1, slotIndex, textureWidth, textureHeight, opacity,
         tlX, tlY, 0, 1, slotIndex, textureWidth, textureHeight, opacity,
         brX, brY, 1, 0, slotIndex, textureWidth, textureHeight, opacity,
         trX, trY, 1, 1, slotIndex, textureWidth, textureHeight, opacity
      );
   }

   return vertices;
}

const getGhostRotation = (building: Entity, ghostType: GhostType): number => {
   switch (ghostType) {
      case GhostType.tunnelDoor: {
         const tunnelComponent = building.getServerComponent(ServerComponentType.tunnel);
         switch (tunnelComponent.doorBitset) {
            case 0b00: {
               // Show the door closest to the player
               const dirToPlayer = building.position.calculateAngleBetween(Player.instance!.position);
               const dot = Math.sin(building.rotation) * Math.sin(dirToPlayer) + Math.cos(building.rotation) * Math.cos(dirToPlayer);

               return dot > 0 ? building.rotation : building.rotation + Math.PI;
            }
            case 0b01: {
               // Show bottom door
               return building.rotation + Math.PI;
            }
            case 0b10: {
               // Show top door
               return building.rotation;
            }
            default: {
               throw new Error("Unknown door bitset " + tunnelComponent.doorBitset);
            }
         }
      }
      default: {
         return snapRotationToPlayer(building, building.rotation);
      }
   }
}

const snapRotationToPlayer = (structure: Entity, rotation: number): number => {
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
      
      const snapInfo = calculateSnapInfo(placeableEntityInfo, true);
      const placePosition = calculatePlacePosition(placeableEntityInfo, snapInfo, true);
      const placeRotation = calculatePlaceRotation(snapInfo);

      const isPlacedOnWall = snapInfo !== null && Board.entityRecord[snapInfo.snappedEntityID].type === EntityType.wall;
      const canPlace = canPlaceItem(placePosition, placeRotation, playerSelectedItem, snapInfo !== null ? snapInfo.entityType : placeableEntityInfo.entityType, isPlacedOnWall);

      return {
         position: placePosition,
         rotation: placeRotation,
         ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[placeableEntityInfo.entityType]!,
         tint: canPlace ? [1, 1, 1] : [1.5, 0.5, 0.5],
         isAttachedToWall: snapInfo !== null ? Board.entityRecord[snapInfo.snappedEntityID].type === EntityType.wall : false,
         opacity: PARTIAL_OPACITY
      };
   }

   // Blueprint ghost
   const hoveredGhostType = getHoveredGhostType();
   if (hoveredGhostType !== null) {
      const selectedStructureID = getSelectedEntityID();
      const selectedStructure = Board.entityRecord[selectedStructureID];

      return {
         position: selectedStructure.position.copy(),
         rotation: getGhostRotation(selectedStructure, hoveredGhostType),
         ghostType: hoveredGhostType,
         isAttachedToWall: false,
         tint: [1, 1, 1],
         opacity: hoveredGhostType === GhostType.deconstructMarker ? 0.8 : PARTIAL_OPACITY
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
   
   const vertices = calculateVertices(ghostInfo.position, ghostInfo.rotation, ghostInfo.ghostType, ghostInfo.isAttachedToWall, ghostInfo.opacity);

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const buffer = gl.createBuffer()!; // @Speed
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); // @Speed

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);

   gl.uniform3f(tintUniformLocation, ghostInfo.tint[0], ghostInfo.tint[1], ghostInfo.tint[2]);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, ENTITY_TEXTURE_ATLAS);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 8);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}