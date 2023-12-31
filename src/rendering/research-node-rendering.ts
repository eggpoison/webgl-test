import { rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import { RESEARCH_NODE_SIZES, ResearchNode, getResearchNode } from "../research";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";

let program: WebGLProgram;

export function createResearchNodeShaders(): void {
   const vertexShaderText = `#version 300 es
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
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(1.0, 0.0, 0.0, 1.0);   
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
}

const calculateNodeVertices = (researchNode: ResearchNode): ReadonlyArray<number> => {
   const halfSize = RESEARCH_NODE_SIZES[researchNode.size] / 2;
   
   const x1 = researchNode.positionX - halfSize;
   const x2 = researchNode.positionX + halfSize;
   const y1 = researchNode.positionY - halfSize;
   const y2 = researchNode.positionY + halfSize;

   const tlX = rotateXAroundPoint(x1, y2, researchNode.positionX, researchNode.positionY, researchNode.rotation);
   const tlY = rotateYAroundPoint(x1, y2, researchNode.positionX, researchNode.positionY, researchNode.rotation);
   const trX = rotateXAroundPoint(x2, y2, researchNode.positionX, researchNode.positionY, researchNode.rotation);
   const trY = rotateYAroundPoint(x2, y2, researchNode.positionX, researchNode.positionY, researchNode.rotation);
   const blX = rotateXAroundPoint(x1, y1, researchNode.positionX, researchNode.positionY, researchNode.rotation);
   const blY = rotateYAroundPoint(x1, y1, researchNode.positionX, researchNode.positionY, researchNode.rotation);
   const brX = rotateXAroundPoint(x2, y1, researchNode.positionX, researchNode.positionY, researchNode.rotation);
   const brY = rotateYAroundPoint(x2, y1, researchNode.positionX, researchNode.positionY, researchNode.rotation);
   
   return [
      blX, blY,
      brX, brY,
      tlX, tlY,
      tlX, tlY,
      brX, brY,
      trX, trY
   ];
}

export function renderResearchNode(): void {
   const researchNode = getResearchNode();
   if (researchNode === null) {
      return;
   }

   const vertices = calculateNodeVertices(researchNode);

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}