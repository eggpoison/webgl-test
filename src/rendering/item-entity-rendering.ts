export function sdjofifdsjiosfdjiogdfig(){}

// import { SETTINGS, Point, rotatePoint, Vector, TILE_TYPE_INFO_RECORD } from "webgl-test-shared";
// import Camera from "../Camera";
// import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
// import { getFrameProgress } from "../entities/Entity";
// import { getTexture } from "../textures";
// import { createWebGLProgram, gl } from "../webgl";
// import Game from "../Game";

// const vertexShaderText = `
// precision mediump float;

// attribute vec2 vertPosition;
// attribute vec2 vertTexCoord;

// varying vec2 fragTexCoord;
 
// void main() {
//    gl_Position = vec4(vertPosition, 0.0, 1.0);

//    fragTexCoord = vertTexCoord;
// }
// `;
// const fragmentShaderText = `
// precision mediump float;
 
// uniform sampler2D sampler;
 
// varying vec2 fragTexCoord;
 
// void main() {
//    gl_FragColor = texture2D(sampler, fragTexCoord);
// }
// `;

// let program: WebGLProgram;

// export function createItemEntityShaders(): void {
//    program = createWebGLProgram(vertexShaderText, fragmentShaderText);
// }

// export function calculateItemEntityRenderPosition(position: Point, velocity: Vector | null): Point {
//    let entityRenderPosition = position.copy();
   
//    // Account for frame progress
//    if (velocity !== null) {
//       const frameVelocity = velocity.copy();
//       frameVelocity.magnitude *= getFrameProgress() / SETTINGS.TPS;

//       const tileX = Math.floor(position.x / SETTINGS.TILE_SIZE);
//       const tileY = Math.floor(position.y / SETTINGS.TILE_SIZE);
//       const tile = Game.board.getTile(tileX, tileY);
//       const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type];

//       // Apply friction
//       frameVelocity.magnitude -= SETTINGS.FRICTION_CONSTANT * tileTypeInfo.friction / SETTINGS.TPS;
//       if (frameVelocity.magnitude < 0) {
//          frameVelocity.magnitude = 0;
//       }
      
//       // Apply the frame velocity to the entity's position
//       const frameVelocityCartesian = frameVelocity.convertToPoint();
//       entityRenderPosition.add(frameVelocityCartesian);
//    }

//    return entityRenderPosition;
// }

// type ItemEntityVertices = { [textureSrc: string]: ReadonlyArray<number> };

// const calculateItemEntityVertices = (): ItemEntityVertices => {
//    const itemVertexRecord: { [textureSrc: string]: Array<number> } = {};

//    for (const itemEntity of Object.values(Game.board.itemEntities)) {
//       const textureSrc = CLIENT_ITEM_INFO_RECORD[itemEntity.type].textureSrc;

//       if (!itemVertexRecord.hasOwnProperty(textureSrc)) {
//          itemVertexRecord[textureSrc] = new Array<number>();
//       }

//       const itemEntityRenderPosition = calculateItemEntityRenderPosition(itemEntity.position, itemEntity.velocity);

//       const x1 = itemEntityRenderPosition.x - SETTINGS.ITEM_SIZE;
//       const x2 = itemEntityRenderPosition.x + SETTINGS.ITEM_SIZE;
//       const y1 = itemEntityRenderPosition.y - SETTINGS.ITEM_SIZE;
//       const y2 = itemEntityRenderPosition.y + SETTINGS.ITEM_SIZE;

//       let topLeft = new Point(x1, y2);
//       let topRight = new Point(x2, y2);
//       let bottomRight = new Point(x2, y1);
//       let bottomLeft = new Point(x1, y1);

//       // Rotate
//       topLeft = rotatePoint(topLeft, itemEntityRenderPosition, itemEntity.rotation);
//       topRight = rotatePoint(topRight, itemEntityRenderPosition, itemEntity.rotation);
//       bottomRight = rotatePoint(bottomRight, itemEntityRenderPosition, itemEntity.rotation);
//       bottomLeft = rotatePoint(bottomLeft, itemEntityRenderPosition, itemEntity.rotation);

//       topLeft = new Point(Camera.calculateXCanvasPosition(topLeft.x), Camera.calculateYCanvasPosition(topLeft.y));
//       topRight = new Point(Camera.calculateXCanvasPosition(topRight.x), Camera.calculateYCanvasPosition(topRight.y));
//       bottomRight = new Point(Camera.calculateXCanvasPosition(bottomRight.x), Camera.calculateYCanvasPosition(bottomRight.y));
//       bottomLeft = new Point(Camera.calculateXCanvasPosition(bottomLeft.x), Camera.calculateYCanvasPosition(bottomLeft.y));
      
//       itemVertexRecord[textureSrc].push(
//          bottomLeft.x, bottomLeft.y, 0, 0,
//          bottomRight.x, bottomRight.y, 1, 0,
//          topLeft.x, topLeft.y, 0, 1,
//          topLeft.x, topLeft.y, 0, 1,
//          bottomRight.x, bottomRight.y, 1, 0,
//          topRight.x, topRight.y, 1, 1
//       );
//    }

//    return itemVertexRecord;
// }

// export function renderItemEntities(): void {
//    gl.useProgram(program);

//    gl.enable(gl.BLEND);
//    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

//    const itemVertexRecord = calculateItemEntityVertices();

//    for (const [textureSrc, vertices] of Object.entries(itemVertexRecord)) {
//       const buffer = gl.createBuffer()!;
//       gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

//       const positionAttribLocation = gl.getAttribLocation(program, "vertPosition");
//       const texCoordAttribLocation = gl.getAttribLocation(program, "vertTexCoord");
//       gl.vertexAttribPointer(
//          positionAttribLocation,
//          2,
//          gl.FLOAT,
//          false,
//          4 * Float32Array.BYTES_PER_ELEMENT,
//          0
//       );
//       gl.vertexAttribPointer(
//          texCoordAttribLocation,
//          2,
//          gl.FLOAT,
//          false,
//          4 * Float32Array.BYTES_PER_ELEMENT,
//          2 * Float32Array.BYTES_PER_ELEMENT
//       );

//       gl.enableVertexAttribArray(positionAttribLocation);
//       gl.enableVertexAttribArray(texCoordAttribLocation);
      
//       const texture = getTexture(`items/${textureSrc}`);
//       gl.activeTexture(gl.TEXTURE0);
//       gl.bindTexture(gl.TEXTURE_2D, texture);

//       gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
//    }

//    gl.disable(gl.BLEND);
//    gl.blendFunc(gl.ONE, gl.ZERO);
// }