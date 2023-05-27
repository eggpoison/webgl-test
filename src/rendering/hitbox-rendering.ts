import { Point, rotatePoint } from "webgl-test-shared";
import Camera from "../Camera";
import { createWebGLProgram, gl } from "../webgl";
import { calculateVisibleEntities } from "./entity-rendering";

const vertexShaderText = `
precision mediump float;

attribute vec2 a_position;

void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);   
}
`;
const fragmentShaderText = `
precision mediump float;

void main() {
   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);   
}
`;

let positionAttribLocation: GLint;

let program: WebGLProgram;

export function createHitboxShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText);

   positionAttribLocation = gl.getAttribLocation(program, "a_position");
}

/** Renders all hitboxes of a specified set of entities */
export function renderEntityHitboxes(): void {
   const entities = calculateVisibleEntities();
   if (entities.size === 0) return;
   
   gl.useProgram(program);

   // Calculate vertices
   const vertices = new Array<number>();
   for (const entity of entities) {
      for (const hitbox of entity.hitboxes) {
         switch (hitbox.info.type) {
            case "rectangular": {
               const x1 = entity.renderPosition.x - hitbox.info.width / 2;
               const x2 = entity.renderPosition.x + hitbox.info.width / 2;
               const y1 = entity.renderPosition.y - hitbox.info.height / 2;
               const y2 = entity.renderPosition.y + hitbox.info.height / 2;
   
               let topLeft = new Point(x1, y2);
               let topRight = new Point(x2, y2);
               let bottomRight = new Point(x2, y1);
               let bottomLeft = new Point(x1, y1);
   
               // Rotate the points to match the entity's rotation
               topLeft = rotatePoint(topLeft, entity.renderPosition, entity.rotation);
               topRight = rotatePoint(topRight, entity.renderPosition, entity.rotation);
               bottomRight = rotatePoint(bottomRight, entity.renderPosition, entity.rotation);
               bottomLeft = rotatePoint(bottomLeft, entity.renderPosition, entity.rotation);
   
               topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
               topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
               bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));
               bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));
   
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
               break;
            }
            case "circular": {
               const CIRCLE_VERTEX_COUNT = 10;
   
               const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;
   
               let previousX: number;
               let previousY: number;
            
               // Add the outer vertices
               for (let radians = 0, n = 0; n <= CIRCLE_VERTEX_COUNT; radians += step, n++) {
                  if (n > 1) {
                     vertices.push(previousX!, previousY!);
                  }
   
                  // Trig shenanigans to get x and y coords
                  const worldX = Math.cos(radians) * hitbox.info.radius + entity.renderPosition.x;
                  const worldY = Math.sin(radians) * hitbox.info.radius + entity.renderPosition.y;
                  
                  const screenX = Camera.calculateXCanvasPosition(worldX);
                  const screenY = Camera.calculateYCanvasPosition(worldY);
                  
                  vertices.push(screenX, screenY);
   
                  previousX = screenX;
                  previousY = screenY;
               }
   
               break;
            }
         }
      }
   }

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(positionAttribLocation);

   gl.drawArrays(gl.LINES, 0, vertices.length / 2);
}