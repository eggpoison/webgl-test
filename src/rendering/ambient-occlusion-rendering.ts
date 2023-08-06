import { SETTINGS } from "webgl-test-shared";
import Game from "../Game"
import { Tile } from "../Tile";
import Camera from "../Camera";
import { createWebGLProgram, gl } from "../webgl";
import { getTexture } from "../textures";

/*
Key:
* = any
1 = wall
0 = ground
*/

// interface AmbientOcclusionType {
//    /** The combination of tile types required for this type of ambient occlusion to be rendered */
//    readonly requiredCombination: string;
//    readonly textureSource: string;
// }

const ATLAS: Record<string, string> = {
   // * 1 *
   // 1 0 1
   // * 1 *
   "*1*101*1*": "4edge.png",
   // * 1 *
   // 1 0 0
   // * 1 *
   "*1*100*1*": "3edge.png",
   // * 1 *
   // 1 0 0
   // * 0 1
   "*1*100*01": "2edge1corner.png",
   // 1 0 1
   // 0 0 0
   // 1 0 1
   "101000101": "4edge.png",
   // * 0 *
   // 1 0 1
   // * 0 *
   "*0*101*0*": "2edge.png",
   // * 1 *
   // 1 0 0
   // * 0 *
   "*1*100*0*": "2edge-2.png",
   // * 1 *
   // 0 0 0
   // 0 0 0
   "*1*000000": "1edge.png",
   // 1 0 0
   // 0 0 0
   // 0 0 0
   "100000000": "1corner.png",
   // 1 0 1
   // 0 0 0
   // 0 0 0
   "101000000": "2corner.png",
   // 1 0 0
   // 0 0 0
   // 0 0 1
   "100000001": "2corner-2.png",
   // 1 0 1
   // 0 0 0
   // 1 0 0
   "101000100": "3corner.png",
   // * 1 *
   // 0 0 0
   // 1 0 0
   "*1*000100": "1edge1corner.png",
   // * 1 *
   // 0 0 0
   // 1 0 1
   "*1*000101": "1edge2corner.png",
};

const vertexShaderText = `
precision mediump float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
   gl_Position = vec4(a_position, 0.0, 1.0);

   v_texCoord = a_texCoord;
}
`;

const fragmentShaderText = `
precision mediump float;

uniform sampler2D u_texture;

varying vec2 v_texCoord;
 
void main() {
   vec4 col = texture2D(u_texture, v_texCoord);
   gl_FragColor = vec4(col.r, col.g, col.b, col.a * 0.3);
}
`;

let program: WebGLProgram;

let textureUniformLocation: WebGLUniformLocation;

let positionAttribLocation: GLint;
let texCoordAttribLocation: GLint;

export function createAmbientOcclusionShaders(): void {
   program = createWebGLProgram(vertexShaderText, fragmentShaderText);

   textureUniformLocation = gl.getUniformLocation(program, "u_textures")!;
   positionAttribLocation = gl.getAttribLocation(program, "a_position");
   texCoordAttribLocation = gl.getAttribLocation(program, "a_texCoord");
}

const getTileSymbol = (tile: Tile): string => {
   return tile.isWall ? "1" : "0";
}

const symbolsDoMatch = (combinationSymbol: string, keySymbol: string): boolean => {
   switch (combinationSymbol) {
      case "*": {
         return true;
      }
      case "1": {
         return keySymbol === "1";
      }
      case "0": {
         return keySymbol === "0";
      }
      default: {
         throw new Error(`Unknown symbol '${combinationSymbol}'.`);
      }
   }
}

interface TileAmbientOcclusionInfo {
   readonly tile: Tile;
   readonly textureSource: string;
   readonly numRotations: number;
   readonly isXFlipped: boolean;
}

const rotateKey = (key: string): string => {
   return key[6] + key[3] + key[0] + key[7] + key[4] + key[1] + key[8] + key[5] + key[2];
}

const flipKeyX = (key: string): string => {
   return key[2] + key[1] + key[0] + key[5] + key[4] + key[3] + key[8] + key[7] + key[6];
}

const getKeyCombination = (key: string): string => {
   // Find the index of the matching combination
   for (const [combination, textureSource] of Object.entries(ATLAS)) {
      let doesMatch = true;
      for (let charIndex = 0; charIndex < 9; charIndex++) {
         if (!symbolsDoMatch(combination[charIndex], key[charIndex])) {
            doesMatch = false;
         }
      }
      if (doesMatch) {
         return textureSource;
      }
   }
   return "";
}

const getTileAmbientOcclusionInfo = (tileX: number, tileY: number): TileAmbientOcclusionInfo | null => {
   const minTileX = Math.max(tileX - 1, 0);
   const maxTileX = Math.min(tileX + 1, SETTINGS.BOARD_DIMENSIONS - 1);
   const minTileY = Math.max(tileY - 1, 0);
   const maxTileY = Math.min(tileY + 1, SETTINGS.BOARD_DIMENSIONS - 1);
   
   let key = "";
   for (let y = maxTileY; y >= minTileY; y--) {
      for (let x = minTileX; x <= maxTileX; x++) {
         const tile = Game.board.getTile(x, y);
         const symbol = getTileSymbol(tile);
         key += symbol;
      }
   }

   {
      // Normal
      const type = getKeyCombination(key);
      if (type !== "") return {
         tile: Game.board.getTile(tileX, tileY),
         textureSource: type,
         numRotations: 0,
         isXFlipped: false,
      };
   }
   {
      // x flipped
      const type = getKeyCombination(flipKeyX(key));
      if (type !== "") return {
         tile: Game.board.getTile(tileX, tileY),
         textureSource: type,
         numRotations: 0,
         isXFlipped: true,
      };
   }
   {
      // 1 Rotation
      const type = getKeyCombination(rotateKey(key));
      if (type !== "") return {
         tile: Game.board.getTile(tileX, tileY),
         textureSource: type,
         numRotations: 1,
         isXFlipped: false,
      };
   }
   {
      // 1 Rotation, x flip
      const type = getKeyCombination(flipKeyX(rotateKey(key)));
      if (type !== "") return {
         tile: Game.board.getTile(tileX, tileY),
         textureSource: type,
         numRotations: 1,
         isXFlipped: true
      };
   }
   {
      // 2 Rotations
      const type = getKeyCombination(rotateKey(rotateKey(key)));
      if (type !== "") return {
         tile: Game.board.getTile(tileX, tileY),
         textureSource: type,
         numRotations: 2,
         isXFlipped: false,
      };
   }
   {
      // 2 Rotations, x flip
      const type = getKeyCombination(flipKeyX(rotateKey(rotateKey(key))));
      if (type !== "") return {
         tile: Game.board.getTile(tileX, tileY),
         textureSource: type,
         numRotations: 2,
         isXFlipped: true
      };
   }
   {
      // 3 Rotations
      const type = getKeyCombination(rotateKey(rotateKey(rotateKey(key))));
      if (type !== "") return {
         tile: Game.board.getTile(tileX, tileY),
         textureSource: type,
         numRotations: 3,
         isXFlipped: false,
      };
   }
   {
      // 3 Rotations, x flip
      const type = getKeyCombination(flipKeyX(rotateKey(rotateKey(rotateKey(key)))));
      if (type !== "") return {
         tile: Game.board.getTile(tileX, tileY),
         textureSource: type,
         numRotations: 3,
         isXFlipped: true
      };
   }
   
   return null;
}

/** Stores the ambient occlusion index of every tile which has ambient occlusion */
const ambientOcclusionRecord: Record<number, TileAmbientOcclusionInfo> = {};

/** Updates the given tile's ambient occlusion */
export function updateTileAmbientOcclusion(tileX: number, tileY: number): void {
   const tileIndex = tileY * SETTINGS.BOARD_DIMENSIONS + tileX;
   
   const ambientOcclusionInfo = getTileAmbientOcclusionInfo(tileX, tileY);
   if (ambientOcclusionInfo !== null) {
      ambientOcclusionRecord[tileIndex] = ambientOcclusionInfo;
   } else {
      delete ambientOcclusionRecord[tileIndex];
   }
}

/** Recalculates the ambient occlusion for all tiles */
export function recalculateAmbientOcclusion(): void {
   for (let tileX = 0; tileX < SETTINGS.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < SETTINGS.BOARD_DIMENSIONS; tileY++) {
         updateTileAmbientOcclusion(tileX, tileY);
      }
   }
}

const getVisibleTiles = (): ReadonlyArray<Tile> => {
   const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

   const minTileX = minChunkX * SETTINGS.CHUNK_SIZE;
   const maxTileX = (maxChunkX + 1) * SETTINGS.CHUNK_SIZE - 1;
   const minTileY = minChunkY * SETTINGS.CHUNK_SIZE;
   const maxTileY = (maxChunkY + 1) * SETTINGS.CHUNK_SIZE - 1;

   const tiles = new Array<Tile>();
   
   for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         const tile = Game.board.getTile(tileX, tileY);
         tiles.push(tile);
      }
   }

   return tiles;
}

type AmbientOcclusionInfo = Record<string, Array<TileAmbientOcclusionInfo>>;

const categoriseTiles = (visibleTiles: ReadonlyArray<Tile>): AmbientOcclusionInfo => {
   const ambientOcclusionInfo: AmbientOcclusionInfo = {};

   for (const textureSource of Object.values(ATLAS)) {
      ambientOcclusionInfo[textureSource] = [];
   }

   for (const tile of visibleTiles) {
      const tileIndex = tile.y * SETTINGS.BOARD_DIMENSIONS + tile.x;
      if (ambientOcclusionRecord.hasOwnProperty(tileIndex)) {
         const info = ambientOcclusionRecord[tileIndex]!;
         ambientOcclusionInfo[info.textureSource].push(info);
      }
   }  

   return ambientOcclusionInfo;
}

const rotateUV = (u: number, v: number): [0 | 1, 0 | 1] => {
   if (u === 0) {
      if (v === 0) {
         return [0, 1];
      } else {
         return [1, 1];
      }
   } else {
      if (v === 0) {
         return [0, 0];
      } else {
         return [1, 0];
      }
   }
}

const render = (ambientOcclusionInfo: AmbientOcclusionInfo): void => {
   // Create vertices
   const vertexArrays = new Array<Array<number>>();
   const textureSources = new Array<string>();

   for (const [textureSource, infos] of Object.entries(ambientOcclusionInfo)) {
      textureSources.push(textureSource);

      const vertices = new Array<number>();

      for (const info of infos) {
         const x1 = Camera.calculateXCanvasPosition(info.tile.x * SETTINGS.TILE_SIZE);
         const x2 = Camera.calculateXCanvasPosition((info.tile.x + 1) * SETTINGS.TILE_SIZE);
         const y1 = Camera.calculateYCanvasPosition(info.tile.y * SETTINGS.TILE_SIZE);
         const y2 = Camera.calculateYCanvasPosition((info.tile.y + 1) * SETTINGS.TILE_SIZE);

         let [bl_u, bl_v] = [0, 0];
         let [br_u, br_v] = [1, 0];
         let [tl_u, tl_v] = [0, 1];
         let [tr_u, tr_v] = [1, 1];

         for (let i = 0; i < info.numRotations; i++) {
            [bl_u, bl_v] = rotateUV(bl_u, bl_v);
            [br_u, br_v] = rotateUV(br_u, br_v);
            [tl_u, tl_v] = rotateUV(tl_u, tl_v);
            [tr_u, tr_v] = rotateUV(tr_u, tr_v);
         }

         if (info.isXFlipped) {
            bl_u = (1 - bl_u);
            br_u = (1 - br_u);
            tl_u = (1 - tl_u);
            tr_u = (1 - tr_u);
         }

         vertices.push(
            x1, y1, bl_u, bl_v,
            x2, y1, br_u, br_v,
            x1, y2, tl_u, tl_v,
            x1, y2, tl_u, tl_v,
            x2, y1, br_u, br_v,
            x2, y2, tr_u, tr_v
         );
      }

      vertexArrays.push(vertices);
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let i = 0; i < textureSources.length; i++) {
      const textureSource = textureSources[i];
      const vertices = vertexArrays[i];
      if (vertices.length === 0) continue;
      
      // Create buffer
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

      // Enable the attributes
      gl.enableVertexAttribArray(positionAttribLocation);
      gl.enableVertexAttribArray(texCoordAttribLocation);

      gl.uniform1i(textureUniformLocation, 0);

      const texture = getTexture("ambient-occlusion/" + textureSource);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Draw the vertices
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}

export function renderAmbientOcclusion(): void {
   const visibleTiles = getVisibleTiles();
   const ambientOcclusionInfo = categoriseTiles(visibleTiles);
   render(ambientOcclusionInfo);
}