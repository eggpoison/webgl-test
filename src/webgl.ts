import { Point } from "webgl-test-shared";
import { gl } from ".";
import Camera from "./Camera";
import { isDev } from "./utils";

/** Number of triangles to create when drawing a circle */
const CIRCLE_DETAIL = 25;

const vertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;
attribute vec4 vertColour;

varying vec4 fragColour;

void main() {
   fragColour = vertColour;
   gl_Position = vec4(vertPosition, 0, 1);
}
`;

const fragmentShaderText = `
precision mediump float;

varying vec4 fragColour;

void main() {
   gl_FragColor = fragColour;
}
`;

let program: WebGLProgram;

export function createCircleShaders(): void {
   createWebGLProgram(vertexShaderText, fragmentShaderText);
}

/**
 * Draws a circle
 * @param x X position of the center of the circle
 * @param y Y position of the center of the circle
 * @param radius Radius of the circle
 */
export function drawCircle(x: number, y: number, radius: number, rgba: [number, number, number, number]): void {
   const triangleVertices = new Array<number>();

   // Add the center point
   const centerX = Camera.getXPositionInScreen(x);
   const centerY = Camera.getYPositionInScreen(y);
   triangleVertices.push(centerX, centerY, ...rgba);

   const step = 2 * Math.PI / CIRCLE_DETAIL;

   // Add the outer vertices
   let n = 0;
   for (let radians = 0; n <= CIRCLE_DETAIL; radians += step) {
      // Trig shenanigans to get x and y coords
      const worldX = Math.cos(radians) * radius + x;
      const worldY = Math.sin(radians) * radius + y;
      
      const screenX = Camera.getXPositionInScreen(worldX);
      const screenY = Camera.getYPositionInScreen(worldY);
      
      triangleVertices.push(screenX, screenY, ...rgba);

      n++;
   }

   const triangleVertexBufferObject = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBufferObject);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

   const positionAttribLocation = gl.getAttribLocation(program, "vertPosition");
   const colourAttribLocation = gl.getAttribLocation(program, "vertColour");
   
   gl.vertexAttribPointer(
      positionAttribLocation, // Attribute location
      2, // Number of elements per attribute
      gl.FLOAT, // Type of elements
      false,
      6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      0 // Offset from the beginning of a single vertex to this attribute
   );
   gl.vertexAttribPointer(
      colourAttribLocation, // Attribute location
      4, // Number of elements per attribute
      gl.FLOAT, // Type of elements
      false,
      6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
   );

   // Enable the attributes
   gl.enableVertexAttribArray(positionAttribLocation);
   gl.enableVertexAttribArray(colourAttribLocation);

   // Draw the tile
   gl.useProgram(program);
   gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_DETAIL + 2);
}

export function createWebGLProgram(vertexShaderText: string, fragmentShaderText: string): WebGLProgram {
   // Create shaders
   const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
   const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;

   gl.shaderSource(vertexShader, vertexShaderText);
   gl.shaderSource(fragmentShader, fragmentShaderText);

   gl.compileShader(vertexShader);
   if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      throw new Error("ERROR compiling vertex shader! " + gl.getShaderInfoLog(vertexShader));
   }

   gl.compileShader(fragmentShader);
   if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      throw new Error("ERROR compiling fragment shader! " + gl.getShaderInfoLog(fragmentShader));
   }

   // Create a program and attach the shaders to the program
   const program = gl.createProgram()!;
   gl.attachShader(program, vertexShader);
   gl.attachShader(program, fragmentShader);
   gl.linkProgram(program);
   if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("ERROR linking program! " + gl.getProgramInfoLog(program));
   }

   if (isDev()) {
      gl.validateProgram(program);
      if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
         throw new Error("ERROR validating program! " + gl.getProgramInfoLog(program));
      }
   }

   return program;
}

export function rotatePoint(point: Point, origin: Point, rotation: number): Point {
   const angle = point.angleBetween(origin);
   if (point.x === 50) {
      console.log(angle, rotation);
   }

   const x = Math.cos(angle) * (point.x - origin.x) + Math.sin(angle) * (point.y - origin.y) + origin.x;
   const y = -Math.sin(angle) * (point.x - origin.x) + Math.cos(angle) * (point.y - origin.y) + origin.y;
   // return new Point(x, y);


   // Subtract origin
   const relativePos = point.subtract(origin);

   // Rotate
   const vector = relativePos.convertToVector();
   vector.direction += rotation;

   // Add back origin
   let rotatedPoint = vector.convertToPoint();
   rotatedPoint = rotatedPoint.add(origin);
   // console.log(rotatedPoint, x, y);
   return new Point(x, y);
   return rotatedPoint;
}

console.log(rotatePoint(new Point(50, 60), new Point(20, 30), 0));