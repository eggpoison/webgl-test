import { GameObjectDebugData, Point, SETTINGS } from "webgl-test-shared";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, generateLine, generateThickCircleWireframeVertices, gl } from "../webgl";
import GameObject from "../GameObject";
import Board from "../Board";

const lineVertexShaderText = `#version 300 es
precision mediump float;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec3 a_colour;

out vec3 v_colour;

void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_colour = a_colour;
}
`;
const lineFragmentShaderText = `#version 300 es
precision mediump float;

in vec3 v_colour;

out vec4 outputColour;

void main() {
   outputColour = vec4(v_colour, 1.0);   
}
`;

const triangleVertexShaderText = `#version 300 es
precision mediump float;

layout(std140) uniform Camera {
   uniform vec2 u_playerPos;
   uniform vec2 u_halfWindowSize;
   uniform float u_zoom;
};

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec3 a_colour;

out vec3 v_colour;

void main() {
   vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
   vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
   gl_Position = vec4(clipSpacePos, 0.0, 1.0);

   v_colour = a_colour;
}
`;
const triangleFragmentShaderText = `#version 300 es
precision mediump float;

in vec3 v_colour;

out vec4 outputColour;

void main() {
   outputColour = vec4(v_colour, 0.6);
}
`;

let lineProgram: WebGLProgram;

let triangleProgram: WebGLProgram;

export function createDebugDataShaders(): void {
   lineProgram = createWebGLProgram(gl, lineVertexShaderText, lineFragmentShaderText);

   const lineCameraBlockIndex = gl.getUniformBlockIndex(lineProgram, "Camera");
   gl.uniformBlockBinding(lineProgram, lineCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   triangleProgram = createWebGLProgram(gl, triangleVertexShaderText, triangleFragmentShaderText);

   const triangleCameraBlockIndex = gl.getUniformBlockIndex(triangleProgram, "Camera");
   gl.uniformBlockBinding(triangleProgram, triangleCameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
}

const addCircleVertices = (vertices: Array<number>, debugData: GameObjectDebugData, gameObject: GameObject): void => {
   for (const circle of debugData.circles) {
      vertices.push(
         ...generateThickCircleWireframeVertices(gameObject.renderPosition, circle.radius, circle.thickness, circle.colour[0], circle.colour[1], circle.colour[2])
      );
   }
}

const addLineVertices = (vertices: Array<number>, debugData: GameObjectDebugData, gameObject: GameObject): void => {
   for (const line of debugData.lines) {
      const targetPosition = new Point(...line.targetPosition);
      vertices.push(
         ...generateLine(gameObject.renderPosition, targetPosition, line.thickness, line.colour[0], line.colour[1], line.colour[2])
      );
   }
}

/** Renders all hitboxes of a specified set of entities */
export function renderLineDebugData(debugData: GameObjectDebugData): void {
   gl.useProgram(lineProgram);

   const gameObject = Board.gameObjects[debugData.gameObjectID];

   const vertices = new Array<number>();
   addCircleVertices(vertices, debugData, gameObject);
   addLineVertices(vertices, debugData, gameObject);

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);
}

const addTileHighlightVertices = (vertices: Array<number>, debugData: GameObjectDebugData): void => {
   for (const tileHighlight of debugData.tileHighlights) {
      const x1 = tileHighlight.tilePosition[0] * SETTINGS.TILE_SIZE;
      const x2 = (tileHighlight.tilePosition[0] + 1) * SETTINGS.TILE_SIZE;

      const y1 = tileHighlight.tilePosition[1] * SETTINGS.TILE_SIZE;
      const y2 = (tileHighlight.tilePosition[1] + 1) * SETTINGS.TILE_SIZE;

      vertices.push(
         x1, y1, tileHighlight.colour[0], tileHighlight.colour[1], tileHighlight.colour[2],
         x2, y1, tileHighlight.colour[0], tileHighlight.colour[1], tileHighlight.colour[2],
         x1, y2, tileHighlight.colour[0], tileHighlight.colour[1], tileHighlight.colour[2],
         x1, y2, tileHighlight.colour[0], tileHighlight.colour[1], tileHighlight.colour[2],
         x2, y1, tileHighlight.colour[0], tileHighlight.colour[1], tileHighlight.colour[2],
         x2, y2, tileHighlight.colour[0], tileHighlight.colour[1], tileHighlight.colour[2],
      );
   }
}

export function renderTriangleDebugData(debugData: GameObjectDebugData): void {
   const vertices = new Array<number>();
   
   gl.useProgram(triangleProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   addTileHighlightVertices(vertices, debugData);

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}