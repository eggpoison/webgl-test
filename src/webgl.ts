import { isDev } from "./utils";

let canvas: HTMLCanvasElement;
export let gl: WebGLRenderingContext;

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
   const glAttempt = canvas.getContext("webgl", { alpha: false });

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

   MAX_ACTIVE_TEXTURE_UNITS = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
}

export function clearCanvas(): void {
   gl.clearColor(1, 1, 1, 1);
   gl.clear(gl.COLOR_BUFFER_BIT);
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