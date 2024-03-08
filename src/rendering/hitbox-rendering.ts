import { rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Entity from "../Entity";
import Board from "../Board";

const CIRCLE_VERTEX_COUNT = 20;

let program: WebGLProgram;
let buffer: WebGLBuffer;

export function createHitboxShaders(): void {
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

   buffer = gl.createBuffer()!;
}

const calculateVisibleEntities = (): Array<Entity> => {
   const visibleEntities = new Array<Entity>();

   for (const gameObject of Board.entities) {
      visibleEntities.push(gameObject);
   }

   return visibleEntities;
}

/** Renders all hitboxes of a specified set of entities */
export function renderEntityHitboxes(): void {
   const entities = calculateVisibleEntities();
   if (entities.length === 0) return;

   // @Speed
   // @Speed
   // @Speed

   // Calculate vertices
   const vertices = new Array<number>();
   for (const entity of entities) {
      for (const hitbox of entity.hitboxes) {
         let hitboxRenderPositionX = hitbox.position.x;
         let hitboxRenderPositionY = hitbox.position.y;

         // Interpolate the hitbox render position
         hitboxRenderPositionX += entity.renderPosition.x - entity.position.x;
         hitboxRenderPositionY += entity.renderPosition.y - entity.position.y;
         
         if (hitbox.hasOwnProperty("width")) {
            // Rectangular
            
            const x1 = hitboxRenderPositionX - (hitbox as RectangularHitbox).width / 2;
            const x2 = hitboxRenderPositionX + (hitbox as RectangularHitbox).width / 2;
            const y1 = hitboxRenderPositionY - (hitbox as RectangularHitbox).height / 2;
            const y2 = hitboxRenderPositionY + (hitbox as RectangularHitbox).height / 2;

            // Rotate to match the entity's rotation
            const topLeftX = rotateXAroundPoint(x1, y2, hitboxRenderPositionX, hitboxRenderPositionY, entity.rotation);
            const topLeftY = rotateYAroundPoint(x1, y2, hitboxRenderPositionX, hitboxRenderPositionY, entity.rotation);
            const topRightX = rotateXAroundPoint(x2, y2, hitboxRenderPositionX, hitboxRenderPositionY, entity.rotation);
            const topRightY = rotateYAroundPoint(x2, y2, hitboxRenderPositionX, hitboxRenderPositionY, entity.rotation);
            const bottomRightX = rotateXAroundPoint(x2, y1, hitboxRenderPositionX, hitboxRenderPositionY, entity.rotation);
            const bottomRightY = rotateYAroundPoint(x2, y1, hitboxRenderPositionX, hitboxRenderPositionY, entity.rotation);
            const bottomLeftX = rotateXAroundPoint(x1, y1, hitboxRenderPositionX, hitboxRenderPositionY, entity.rotation);
            const bottomLeftY = rotateYAroundPoint(x1, y1, hitboxRenderPositionX, hitboxRenderPositionY, entity.rotation);

            vertices.push(
               topLeftX, topLeftY,
               topRightX, topRightY,
               topRightX, topRightY,
               bottomRightX, bottomRightY,
               bottomRightX, bottomRightY,
               bottomLeftX, bottomLeftY,
               bottomLeftX, bottomLeftY,
               topLeftX, topLeftY
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
               const worldX = Math.cos(radians) * (hitbox as CircularHitbox).radius + hitboxRenderPositionX;
               const worldY = Math.sin(radians) * (hitbox as CircularHitbox).radius + hitboxRenderPositionY;
               
               vertices.push(worldX, worldY);

               previousX = worldX;
               previousY = worldY;
            }
         }
      }
   }
   
   gl.useProgram(program);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.LINES, 0, vertices.length / 2);
}