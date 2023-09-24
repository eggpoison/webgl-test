import { Point, rotatePoint } from "webgl-test-shared";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import { calculateVisibleGameObjects } from "./game-object-rendering";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import CircularHitbox from "../hitboxes/CircularHitbox";

const CIRCLE_VERTEX_COUNT = 20;

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

let program: WebGLProgram;

export function createHitboxShaders(): void {
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);
}

/** Renders all hitboxes of a specified set of entities */
export function renderEntityHitboxes(): void {
   const gameObjects = calculateVisibleGameObjects();
   if (gameObjects.length === 0) return;
   
   gl.useProgram(program);

   // Calculate vertices
   const vertices = new Array<number>();
   for (const gameObject of gameObjects) {
      for (const hitbox of gameObject.hitboxes) {
         const hitboxRenderPosition = hitbox.gameObject.renderPosition.copy();
         if (typeof hitbox.offset !== "undefined") {
            hitboxRenderPosition.add(hitbox.offset);
         }
         
         if (hitbox.hasOwnProperty("width")) {
            // Rectangular
            
            const x1 = hitboxRenderPosition.x - (hitbox as RectangularHitbox).width / 2;
            const x2 = hitboxRenderPosition.x + (hitbox as RectangularHitbox).width / 2;
            const y1 = hitboxRenderPosition.y - (hitbox as RectangularHitbox).height / 2;
            const y2 = hitboxRenderPosition.y + (hitbox as RectangularHitbox).height / 2;

            // @Speed: Garbage collection

            let topLeft = new Point(x1, y2);
            let topRight = new Point(x2, y2);
            let bottomRight = new Point(x2, y1);
            let bottomLeft = new Point(x1, y1);

            // Rotate the points to match the entity's rotation
            topLeft = rotatePoint(topLeft, hitboxRenderPosition, gameObject.rotation);
            topRight = rotatePoint(topRight, hitboxRenderPosition, gameObject.rotation);
            bottomRight = rotatePoint(bottomRight, hitboxRenderPosition, gameObject.rotation);
            bottomLeft = rotatePoint(bottomLeft, hitboxRenderPosition, gameObject.rotation);

            vertices.push(
               topLeft.x, topLeft.y,
               topRight.x, topRight.y,
               topRight.x, topRight.y,
               bottomRight.x, bottomRight.y,
               bottomRight.x, bottomRight.y,
               bottomLeft.x, bottomLeft.y,
               bottomLeft.x, bottomLeft.y,
               topLeft.x, topLeft.y
            );
         } else {
            // Circular

            const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;

            let previousX: number;
            let previousY: number;
         
            // Add the outer vertices
            for (let radians = 0, n = 0; n <= CIRCLE_VERTEX_COUNT; radians += step, n++) {
               if (n > 1) {
                  vertices.push(previousX!, previousY!);
               }

               // Trig shenanigans to get x and y coords
               const worldX = Math.cos(radians) * (hitbox as CircularHitbox).radius + hitboxRenderPosition.x;
               const worldY = Math.sin(radians) * (hitbox as CircularHitbox).radius + hitboxRenderPosition.y;
               
               vertices.push(worldX, worldY);

               previousX = worldX;
               previousY = worldY;
            }
         }
      }
   }

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.LINES, 0, vertices.length / 2);
}