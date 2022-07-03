import { gl } from ".";
import { getXPositionInCanvas, getYPositionInCanvas, isDev } from "./utils";

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

export function createCircleProgram(): void {
   // Create shaders
   const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
   const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;

   gl.shaderSource(vertexShader, vertexShaderText);
   gl.shaderSource(fragmentShader, fragmentShaderText);

   gl.compileShader(vertexShader);
   if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error("ERROR compiling vertex shader!", gl.getShaderInfoLog(vertexShader));
      return;
   }

   gl.compileShader(fragmentShader);
   if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error("ERROR compiling fragment shader!", gl.getShaderInfoLog(fragmentShader));
      return;
   }

   // Create a program and attach the shaders to the program
   program = gl.createProgram()!;
   gl.attachShader(program, vertexShader);
   gl.attachShader(program, fragmentShader);
   gl.linkProgram(program);
   if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("ERROR linking program!", gl.getProgramInfoLog(program));
      return;
   }

   if (isDev()) {
      gl.validateProgram(program);
      if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
         console.error("ERROR validating program!", gl.getProgramInfoLog(program));
         return;
      }
   }
}

/**
 * Draws a circle
 * @param x X position of the center of the circle
 * @param y Y position of the center of the circle
 * @param radius Radius of the circle
 */
export function drawCircle(x: number, y: number, radius: number, rgba: [number, number, number, number]): void {
   // x, y, r, g, b, a
   const vertices = new Array<number>();
   for (let i = 0; i < 360; i += 360 / CIRCLE_DETAIL) {
      // Add the center of the circle as the first vertex
      vertices.push(getXPositionInCanvas(x));
      vertices.push(getYPositionInCanvas(y));
      vertices.push(...rgba);

      // Two outer points
      for (let j = 0; j < 2; j++) {
         // Trig shenanigans
         const radians = (i + 360 / CIRCLE_DETAIL * j) / 180 * Math.PI;
         const worldX = Math.cos(radians) * radius + x;
         const worldY = Math.sin(radians) * radius + y;
         
         const canvasX = getXPositionInCanvas(worldX);
         const canvasY = getYPositionInCanvas(worldY);
         
         vertices.push(canvasX);
         vertices.push(canvasY);
         
         // Colour
         vertices.push(...rgba);
      }
   }

   const triangleVertexBufferObject = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBufferObject);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   const positionAttribLocation = gl.getAttribLocation(program, "vertPosition")
   const colourAttribLocation = gl.getAttribLocation(program, "vertColour")
   
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
   gl.drawArrays(gl.TRIANGLES, 0, CIRCLE_DETAIL * 6);
}