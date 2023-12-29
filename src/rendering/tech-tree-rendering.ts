import { TECHS, TechInfo, angle, getTechByID } from "webgl-test-shared";
import Game from "../Game";
import { createWebGLProgram, halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "../webgl";
import { techIsHovered } from "../components/game/TechTree";

const CONNECTOR_WIDTH = 10;

let gl: WebGL2RenderingContext;

let backgroundProgram: WebGLProgram;
let connectorProgram: WebGLProgram;

let TECH_TREE_X = 0;
let TECH_TREE_Y = 0;
let TECH_TREE_ZOOM = 1;

export function updateTechTreeCanvasSize(): void {
   gl.viewport(0, 0, windowWidth, windowHeight);
}

export function setTechTreeX(x: number): void {
   TECH_TREE_X = x;
}

export function setTechTreeY(y: number): void {
   TECH_TREE_Y = y;
}

export function setTechTreeZoom(zoom: number): void {
   TECH_TREE_ZOOM = zoom;
}

const createGLContext = (): void => {
   const canvas = document.getElementById("tech-tree-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl2");

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
}

const createBackgroundShaders = (): void => {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(location = 0) in vec2 a_position;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(0.2, 0.2, 0.2, 1.0);
   }
   `;

   backgroundProgram = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
}

const createConnectorShaders = (): void => {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_isUnlocked;

   out float v_isUnlocked;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);

      v_isUnlocked = a_isUnlocked;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;

   #define UNLOCKED_COLOUR 0.2, 1.0, 0.2
   #define LOCKED_COLOUR 1.0, 0.3, 0.1

   in float v_isUnlocked;
   
   out vec4 outputColour;
   
   void main() {
      if (v_isUnlocked > 0.5) {
         outputColour = vec4(UNLOCKED_COLOUR, 1.0);
      } else {
         outputColour = vec4(LOCKED_COLOUR, 1.0);
      }
   }
   `;

   connectorProgram = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
}

export function createTechTreeShaders(): void {
   createGLContext();
   createBackgroundShaders();
   createConnectorShaders();
}

const renderBackground = (): void => {
   gl.useProgram(backgroundProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const vertices = [
      -1, -1,
      1, 1,
      -1, 1,
      -1, -1,
      1, -1,
      1, 1
   ];
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

/** X position in the screen (0 = left, windowWidth = right) */
const calculateXScreenPos = (x: number): number => {
   // Account for the player position
   let position = x + TECH_TREE_X;
   // Account for zoom
   position = position * TECH_TREE_ZOOM + halfWindowWidth;
   position = position / halfWindowWidth - 1;
   return position;
}

/** Y position in the screen (0 = bottom, windowHeight = top) */
const calculateYScreenPos = (y: number): number => {
   // Account for the player position
   let position = y - TECH_TREE_Y;
   // Account for zoom
   position = position * TECH_TREE_ZOOM + halfWindowHeight;
   position = position / halfWindowHeight - 1;
   return position;
}

const addConnectorVertices = (vertices: Array<number>, startTech: TechInfo, endTech: TechInfo, isUnlocked: boolean): void => {
   const direction = angle(endTech.positionX - startTech.positionX, endTech.positionY - startTech.positionY);
   const perpendicularDirection1 = direction + Math.PI / 2;
   const perpendicularDirection2 = direction - Math.PI / 2;

   const a = 16; // @Cleanup
   const connectorWidth = (techIsHovered(startTech.id) || techIsHovered(endTech.id)) ? CONNECTOR_WIDTH * 1.3 : CONNECTOR_WIDTH;
   const topLeftX = calculateXScreenPos(startTech.positionX * a + connectorWidth * Math.sin(perpendicularDirection1));
   const topLeftY = calculateYScreenPos(startTech.positionY * a + connectorWidth * Math.cos(perpendicularDirection1));
   const bottomLeftX = calculateXScreenPos(startTech.positionX * a + connectorWidth * Math.sin(perpendicularDirection2));
   const bottomLeftY = calculateYScreenPos(startTech.positionY * a + connectorWidth * Math.cos(perpendicularDirection2));
   const topRightX = calculateXScreenPos(endTech.positionX * a + connectorWidth * Math.sin(perpendicularDirection1));
   const topRightY = calculateYScreenPos(endTech.positionY * a + connectorWidth * Math.cos(perpendicularDirection1));
   const bottomRightX = calculateXScreenPos(endTech.positionX * a + connectorWidth * Math.sin(perpendicularDirection2));
   const bottomRightY = calculateYScreenPos(endTech.positionY * a + connectorWidth * Math.cos(perpendicularDirection2));

   const isUnlockedInt = isUnlocked ? 1 : 0;

   vertices.push(
      bottomLeftX, bottomLeftY, isUnlockedInt,
      bottomRightX, bottomRightY, isUnlockedInt,
      topLeftX, topLeftY, isUnlockedInt,
      topLeftX, topLeftY, isUnlockedInt,
      bottomRightX, bottomRightY, isUnlockedInt,
      topRightX, topRightY, isUnlockedInt
   );
}

export function techIsDirectlyAccessible(techInfo: TechInfo): boolean {
   if (Game.tribe === null) {
      return false;
   }
   
   if (Game.tribe.hasUnlockedTech(techInfo.id)) {
      return true;
   }
   
   // Make sure all dependencies have been unlocked
   for (const dependencyTechID of techInfo.dependencies) {
      if (!Game.tribe!.hasUnlockedTech(dependencyTechID)) {
         return false;
      }
   }

   return true;
}

const calculateConnectorVertices = (): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   // For all unlocked techs, draw the connectors for their dependencies
   for (const techID of Game.tribe!.unlockedTechs) {
      const tech = getTechByID(techID);
      for (const dependencyTechID of tech.dependencies) {
         const dependencyTech = getTechByID(dependencyTechID);
         addConnectorVertices(vertices, dependencyTech, tech, true);
      }
   }

   // For all directly accessible locked techs, draw the connectors for their dependencies
   for (const tech of TECHS) {
      if (!Game.tribe!.hasUnlockedTech(tech.id) && techIsDirectlyAccessible(tech)) {
         for (const dependencyTechID of tech.dependencies) {
            const dependencyTech = getTechByID(dependencyTechID);
            addConnectorVertices(vertices, dependencyTech, tech, false);
         }
      }
   }

   return vertices;
}

const renderConnectors = (): void => {
   if (Game.tribe === null) {
      return;
   }

   gl.useProgram(connectorProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const vertices = calculateConnectorVertices();

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

export function renderTechTree(): void {
   renderBackground();
   renderConnectors();
}