import { GameObjectDebugData, Point, SETTINGS } from "webgl-test-shared";
import Camera from "../Camera";
import { createWebGLProgram, generateLine, generateThickCircleWireframeVertices, gl } from "../webgl";
import GameObject from "../GameObject";
import Game from "../Game";

const lineVertexShaderText = `#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
in vec3 a_colour;

out vec3 v_colour;

void main() {
   v_colour = a_colour;
   
   gl_Position = vec4(a_position, 0.0, 1.0);   
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

layout(location = 0) in vec2 a_position;
in vec3 a_colour;

out vec3 v_colour;

void main() {
   v_colour = a_colour;
   
   gl_Position = vec4(a_position, 0.0, 1.0);   
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

let lineProgramColourAttribLocation: GLint;

let lineProgram: WebGLProgram;

let triangleProgramColourAttribLocation: GLint;

let triangleProgram: WebGLProgram;

export function createDebugDataShaders(): void {
   lineProgram = createWebGLProgram(gl, lineVertexShaderText, lineFragmentShaderText);

   lineProgramColourAttribLocation = gl.getAttribLocation(lineProgram, "a_colour");

   triangleProgram = createWebGLProgram(gl, triangleVertexShaderText, triangleFragmentShaderText);

   triangleProgramColourAttribLocation = gl.getAttribLocation(triangleProgram, "a_colour");
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

   const gameObject = Game.board.gameObjects[debugData.gameObjectID];

   const vertices = new Array<number>();
   addCircleVertices(vertices, debugData, gameObject);
   addLineVertices(vertices, debugData, gameObject);

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(lineProgramColourAttribLocation, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(lineProgramColourAttribLocation);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);
}

const addTileHighlightVertices = (vertices: Array<number>, debugData: GameObjectDebugData, gameObject: GameObject): void => {
   for (const tileHighlight of debugData.tileHighlights) {
      const x1 = Camera.calculateXCanvasPosition(tileHighlight.tilePosition[0] * SETTINGS.TILE_SIZE);
      const x2 = Camera.calculateXCanvasPosition((tileHighlight.tilePosition[0] + 1) * SETTINGS.TILE_SIZE);

      const y1 = Camera.calculateYCanvasPosition(tileHighlight.tilePosition[1] * SETTINGS.TILE_SIZE);
      const y2 = Camera.calculateYCanvasPosition((tileHighlight.tilePosition[1] + 1) * SETTINGS.TILE_SIZE);

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
   const gameObject = Game.board.gameObjects[debugData.gameObjectID];

   const vertices = new Array<number>();
   
   gl.useProgram(triangleProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   addTileHighlightVertices(vertices, debugData, gameObject);

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(triangleProgramColourAttribLocation, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(triangleProgramColourAttribLocation);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 5);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}