import { PathfindingNodeIndex, PathfindingSettings, SETTINGS } from "webgl-test-shared";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import Board from "../Board";
import Game from "../Game";
import OPTIONS from "../options";
import Camera from "../Camera";

enum NodeType {
   occupied,
   path,
   rawPath
}

interface NodeInfo {
   readonly node: PathfindingNodeIndex;
   readonly type: NodeType;
}

const NODE_THICKNESS = 3;
const NODE_RADIUS = 8;
const NODE_CIRCLE_VERTEX_COUNT = 10;

let nodeProgram: WebGLProgram;

let connectorProgram: WebGLProgram;

let visiblePathfindingNodeOccupances: ReadonlyArray<PathfindingNodeIndex>;

export function setVisiblePathfindingNodeOccupances(newVisiblePathfindingNodeOccupances: ReadonlyArray<PathfindingNodeIndex>): void {
   // @Speed: Garbage collection
   visiblePathfindingNodeOccupances = newVisiblePathfindingNodeOccupances;
}

export function createPathfindNodeShaders(): void {
   const nodeVertexShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_nodeType;

   out float v_nodeType;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_nodeType = a_nodeType;
   }
   `;
   const nodeFragmentShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   in float v_nodeType;
   
   out vec4 outputColour;
   
   void main() {
      if (v_nodeType == ${NodeType.occupied.toFixed(1)}) {
         // Red for occupied
         outputColour = vec4(1.0, 0.0, 0.0, 1.0);
      } else if (v_nodeType == ${NodeType.path.toFixed(1)}) {
         // Blue for path
         outputColour = vec4(0.0, 0.0, 1.0, 1.0);
      } else {
         // Orange for raw path
         outputColour = vec4(1.0, 0.5, 0.0, 1.0);
      }
   }
   `;
   
   const connectorVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   }
   `;
   const connectorFragmentShaderText = `#version 300 es
   precision mediump float;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(1.0, 0.0, 0.0, 1.0);
   }
   `;

   nodeProgram = createWebGLProgram(gl, nodeVertexShaderText, nodeFragmentShaderText);

   const lineCameraBlockIndex = gl.getUniformBlockIndex(nodeProgram, "Camera");
   gl.uniformBlockBinding(nodeProgram, lineCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   connectorProgram = createWebGLProgram(gl, connectorVertexShaderText, connectorFragmentShaderText);

   const triangleCameraBlockIndex = gl.getUniformBlockIndex(connectorProgram, "Camera");
   gl.uniformBlockBinding(connectorProgram, triangleCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
}

const renderNodes = (nodeInfoArray: ReadonlyArray<NodeInfo>): void => {
   gl.useProgram(nodeProgram);

   // Calculate vertices
   let trigIdx = 0;
   const vertexData = new Float32Array(nodeInfoArray.length * NODE_CIRCLE_VERTEX_COUNT * 6 * 3);
   for (let i = 0; i < nodeInfoArray.length; i++) {
      const nodeInfo = nodeInfoArray[i];

      const x = nodeInfo.node % PathfindingSettings.NODES_IN_WORLD_WIDTH * PathfindingSettings.NODE_SEPARATION;
      const y = Math.floor(nodeInfo.node / PathfindingSettings.NODES_IN_WORLD_WIDTH) * PathfindingSettings.NODE_SEPARATION;
      
      const step = 2 * Math.PI / NODE_CIRCLE_VERTEX_COUNT;
   
      // Add the outer vertices
      for (let radians = 0, n = 0; n < NODE_CIRCLE_VERTEX_COUNT; radians += step, n++) {
         // @Speed: Garbage collection

         const sinRadians = Math.sin(radians);
         const cosRadians = Math.cos(radians);
         const sinNextRadians = Math.sin(radians + step);
         const cosNextRadians = Math.cos(radians + step);

         const blX = x + (NODE_RADIUS - NODE_THICKNESS) * sinRadians;
         const blY = y + (NODE_RADIUS - NODE_THICKNESS) * cosRadians;
         const brX = x + (NODE_RADIUS - NODE_THICKNESS) * sinNextRadians;
         const brY = y + (NODE_RADIUS - NODE_THICKNESS) * cosNextRadians;
         const tlX = x + (NODE_RADIUS) * sinRadians;
         const tlY = y + (NODE_RADIUS) * cosRadians;
         const trX = x + (NODE_RADIUS) * sinNextRadians;
         const trY = y + (NODE_RADIUS) * cosNextRadians;

         const vertexOffset = trigIdx * 6 * 3;
         trigIdx++;

         vertexData[vertexOffset] = blX;
         vertexData[vertexOffset + 1] = blY;
         vertexData[vertexOffset + 2] = nodeInfo.type;

         vertexData[vertexOffset + 3] = brX;
         vertexData[vertexOffset + 4] = brY;
         vertexData[vertexOffset + 5] = nodeInfo.type;

         vertexData[vertexOffset + 6] = tlX;
         vertexData[vertexOffset + 7] = tlY;
         vertexData[vertexOffset + 8] = nodeInfo.type;

         vertexData[vertexOffset + 9] = tlX;
         vertexData[vertexOffset + 10] = tlY;
         vertexData[vertexOffset + 11] = nodeInfo.type;

         vertexData[vertexOffset + 12] = brX;
         vertexData[vertexOffset + 13] = brY;
         vertexData[vertexOffset + 14] = nodeInfo.type;

         vertexData[vertexOffset + 15] = trX;
         vertexData[vertexOffset + 16] = trY;
         vertexData[vertexOffset + 17] = nodeInfo.type;
      }
   }

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, trigIdx * 6);
}

export function renderPathfindingNodes(): void {
   const nodeInfoArray = new Array<NodeInfo>();

   // @Speed: Remove duplicates (nodes with same position)
   
   if (OPTIONS.showPathfindingNodes) {
      const minNodeX = Math.ceil(Camera.minVisibleChunkX * SETTINGS.CHUNK_UNITS / PathfindingSettings.NODE_SEPARATION);
      const maxNodeX = Math.floor((Camera.maxVisibleChunkX + 1) * SETTINGS.CHUNK_UNITS / PathfindingSettings.NODE_SEPARATION);
      const minNodeY = Math.ceil(Camera.minVisibleChunkY * SETTINGS.CHUNK_UNITS / PathfindingSettings.NODE_SEPARATION);
      const maxNodeY = Math.floor((Camera.maxVisibleChunkY + 1) * SETTINGS.CHUNK_UNITS / PathfindingSettings.NODE_SEPARATION);

      for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
         for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
            const node = nodeY * PathfindingSettings.NODES_IN_WORLD_WIDTH + nodeX;
            if (visiblePathfindingNodeOccupances.indexOf(node) !== -1) {
               nodeInfoArray.push({
                  node: node,
                  type: NodeType.occupied
               });
            }
         }
      }
   }

   if (Game.entityDebugData !== null && Board.hasEntityID(Game.entityDebugData.entityID) && Game.entityDebugData.hasOwnProperty("pathData")) {
      for (const node of Game.entityDebugData.pathData!.rawPathNodes) {
         nodeInfoArray.push({
            node: node,
            type: NodeType.rawPath
         });
      }

      for (const node of Game.entityDebugData.pathData!.pathNodes) {
         nodeInfoArray.push({
            node: node,
            type: NodeType.path
         });
      }
   }

   // @Incomplete
   // renderConnectors();
   renderNodes(nodeInfoArray);
}