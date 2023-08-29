import { Point, Vector } from "webgl-test-shared";
import { isDev } from "./utils";
import Camera from "./Camera";

export const CIRCLE_VERTEX_COUNT = 50;

let canvas: HTMLCanvasElement;
export let gl: WebGL2RenderingContext;

export let windowWidth = window.innerWidth;
export let windowHeight = window.innerHeight;
export let halfWindowWidth = windowWidth / 2;
export let halfWindowHeight = windowHeight / 2;

export let MAX_ACTIVE_TEXTURE_UNITS = 8;

export function resizeCanvas(): void {
   if (typeof canvas === "undefined") return;

   // Update the size of the canvas
   canvas.width = window.innerWidth;
   canvas.height = window.innerHeight;

   windowWidth = window.innerWidth;
   windowHeight = window.innerHeight;

   halfWindowWidth = windowWidth / 2;
   halfWindowHeight = windowHeight / 2;

   gl.viewport(0, 0, windowWidth, windowHeight);

   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;
   textCanvas.width = windowWidth;
   textCanvas.height = windowHeight;
}

// Run the resizeCanvas function whenever the window is resize
window.addEventListener("resize", resizeCanvas);

export function createWebGLContext(): void {
   canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl2", { alpha: false });

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

   MAX_ACTIVE_TEXTURE_UNITS = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
}

const shaderStrings = new Array<string>();
const shaderStringCallbacks = new Array<(shaderString: string) => void>();

export function createShaderString(shaderString: string, callback: (shaderString: string) => void): void {
   shaderStrings.push(shaderString);
   shaderStringCallbacks.push(callback);
}

export function createShaderStrings(): void {
   for (let i = 0; i < shaderStrings.length; i++) {
      const unprocessedShaderString = shaderStrings[i];
      // Replace all instances of "__MAX_ACTIVE_TEXTURE_UNITS__" with the actual max active texture units.
      const shaderString = unprocessedShaderString.split("__MAX_ACTIVE_TEXTURE_UNITS__").join(MAX_ACTIVE_TEXTURE_UNITS.toString());
      shaderStringCallbacks[i](shaderString);
   }
}

export function createWebGLProgram(vertexShaderText: string, fragmentShaderText: string, attrib0Name?: string): WebGLProgram {
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

   // 
   // Create the program and attach shaders to the program
   // 

   const program = gl.createProgram()!;

   gl.attachShader(program, vertexShader);
   gl.attachShader(program, fragmentShader);

   if (typeof attrib0Name !== "undefined") {
      gl.bindAttribLocation(program, 0, attrib0Name);
   }

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

export function generateLine(startPosition: Point, endPosition: Point, thickness: number, r: number, g: number, b: number): Array<number> {
   let offset = endPosition.copy();
   offset.subtract(startPosition);
   const offsetVector = offset.convertToVector();
   offsetVector.magnitude = thickness / 2;
   offset = offsetVector.convertToPoint();

   const leftOffset = new Point(-offset.y, offset.x);
   const rightOffset = new Point(offset.y, -offset.x);

   const bl = startPosition.copy();
   bl.add(leftOffset);
   const br = startPosition.copy();
   br.add(rightOffset);
   const tl = endPosition.copy();
   tl.add(leftOffset);
   const tr = endPosition.copy();
   tr.add(rightOffset);

   bl.x = Camera.calculateXCanvasPosition(bl.x);
   bl.y = Camera.calculateYCanvasPosition(bl.y);
   br.x = Camera.calculateXCanvasPosition(br.x);
   br.y = Camera.calculateYCanvasPosition(br.y);
   tl.x = Camera.calculateXCanvasPosition(tl.x);
   tl.y = Camera.calculateYCanvasPosition(tl.y);
   tr.x = Camera.calculateXCanvasPosition(tr.x);
   tr.y = Camera.calculateYCanvasPosition(tr.y);

   const vertices: Array<number> = [
      bl.x, bl.y, r, g, b,
      br.x, br.y, r, g, b,
      tl.x, tl.y, r, g, b,
      tl.x, tl.y, r, g, b,
      br.x, br.y, r, g, b,
      tr.x, tr.y, r, g, b
   ];

   return vertices;
}

export function generateThickCircleWireframeVertices(position: Point, radius: number, thickness: number, r: number, g: number, b: number): Array<number> {
   const vertices = new Array<number>();
   const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;
   
   // Add the outer vertices
   for (let radians = 0, n = 0; n < CIRCLE_VERTEX_COUNT; radians += step, n++) {
      // Trig shenanigans to get x and y coords
      const bl = new Vector(radius, radians).convertToPoint();
      const br = new Vector(radius, radians + step).convertToPoint();
      const tl = new Vector(radius + thickness, radians).convertToPoint();
      const tr = new Vector(radius + thickness, radians + step).convertToPoint();

      bl.add(position);
      br.add(position);
      tl.add(position);
      tr.add(position);

      bl.x = Camera.calculateXCanvasPosition(bl.x);
      bl.y = Camera.calculateYCanvasPosition(bl.y);
      br.x = Camera.calculateXCanvasPosition(br.x);
      br.y = Camera.calculateYCanvasPosition(br.y);
      tl.x = Camera.calculateXCanvasPosition(tl.x);
      tl.y = Camera.calculateYCanvasPosition(tl.y);
      tr.x = Camera.calculateXCanvasPosition(tr.x);
      tr.y = Camera.calculateYCanvasPosition(tr.y);
      
      vertices.push(
         bl.x, bl.y, r, g, b,
         br.x, br.y, r, g, b,
         tl.x, tl.y, r, g, b,
         tl.x, tl.y, r, g, b,
         br.x, br.y, r, g, b,
         tr.x, tr.y, r, g, b
      );
   }

   return vertices;
}