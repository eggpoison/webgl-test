import { gl } from ".";
import { generateTerrain } from "./terrain-generation";
import { getTexture } from "./textures";
import Tile, { TileInfo, TILE_TYPE_INFO_RECORD } from "./Tile";
import { getXPositionInCanvas, getYPositionInCanvas } from "./utils";

const tileVertexShaderText = `
precision mediump float;

attribute vec2 vertPosition;
attribute vec2 vertTexCoord;

varying vec2 fragTexCoord;
 
void main() {
   gl_Position = vec4(vertPosition, 0.0, 1.0);

   fragTexCoord = vertTexCoord;
}
`;

const tileFragmentShaderText = `
precision mediump float;
 
uniform sampler2D sampler;
 
varying vec2 fragTexCoord;
 
void main() {
   gl_FragColor = texture2D(sampler, fragTexCoord);
}
`;

abstract class Board {
   /** Size of a tile */
   public static readonly TILE_SIZE = 60;
   /** Width and height of the board in chunks */
   public static readonly BOARD_SIZE = 16;
   /** Number of tiles in the width and height of a chunk */
   public static readonly CHUNK_SIZE = 8;
   /** Width and height of the board in tiles */
   public static readonly DIMENSIONS = this.BOARD_SIZE * this.CHUNK_SIZE;

   public static tiles: Array<Array<Tile>>;

   private static tileProgram: WebGLProgram;

   private static tileTextures: { [key: string]: WebGLTexture } = {};

   public static setup(): void {
      // Generate terrain
      this.tiles = generateTerrain();

      // Create shaders
      const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;

      gl.shaderSource(vertexShader, tileVertexShaderText);
      gl.shaderSource(fragmentShader, tileFragmentShaderText);

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
      this.tileProgram = gl.createProgram()!;
      gl.attachShader(this.tileProgram, vertexShader);
      gl.attachShader(this.tileProgram, fragmentShader);
      gl.linkProgram(this.tileProgram);
      if (!gl.getProgramParameter(this.tileProgram, gl.LINK_STATUS)) {
         console.error("ERROR linking program!", gl.getProgramInfoLog(this.tileProgram));
         return;
      }

      // NOTE: only do in testing!
      gl.validateProgram(this.tileProgram);
      if (!gl.getProgramParameter(this.tileProgram, gl.VALIDATE_STATUS)) {
         console.error("ERROR validating program!", gl.getProgramInfoLog(this.tileProgram));
         return;
      }

      
      // this.vertPositionLocation = gl.getAttribLocation(this.tileProgram, "a_position");
      // this.v_texCoordLocation = gl.getAttribLocation(this.tileProgram, "a_texCoord");
      
      // gl.enableVertexAttribArray(this.vertPositionLocation);
      // gl.enableVertexAttribArray(this.v_texCoordLocation);



      // //
      // // Create grass texture:
      // //
      // const image = TEXTURES["grass.jpg"];

      // // Look up where the texture coordinates need to go.
      // var texCoordLocation = gl.getAttribLocation(this.tileProgram, "a_texCoord");
      // gl.enableVertexAttribArray(texCoordLocation);
      // gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
      
      // // Create a texture.
      // var texture = gl.createTexture();
      // gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // // Set the parameters so we can render any size image.
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      
      // // Upload the image into the texture.
      // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
   }

   public static getTile(x: number, y: number): TileInfo {
      return this.tiles[x][y];
   }

   public static update(): void {

   }

   public static render(): void {
      for (let x = 0; x < this.DIMENSIONS; x++) {
         for (let y = 0; y < this.DIMENSIONS; y++) {
            this.renderTile(x, y);
         }
      }
   }

   private static renderTile(tileX: number, tileY: number): void {
      const tile = this.getTile(tileX, tileY);
      const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type]; 

      const x1 = tileX * Board.TILE_SIZE;
      const x2 = x1 + Board.TILE_SIZE;
      const y1 = tileY * Board.TILE_SIZE;
      const y2 = y1 + Board.TILE_SIZE

      const canvasX1 = getXPositionInCanvas(x1);
      const canvasX2 = getXPositionInCanvas(x2);
      const canvasY1 = getYPositionInCanvas(y1);
      const canvasY2 = getYPositionInCanvas(y2);

      // Create buffer
      const triangleVertices =
      [
         canvasX1, canvasY1,    0, 0,
         canvasX2, canvasY1,    1, 0,
         canvasX1, canvasY2,    0, 1,
         canvasX1, canvasY2,    0, 1,
         canvasX2, canvasY1,    1, 0,
         canvasX2, canvasY2,    1, 1
      ];

      const triangleVertexBufferObject = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBufferObject);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

      const positionAttribLocation = gl.getAttribLocation(this.tileProgram, "vertPosition")
      const texCoordAttribLocation = gl.getAttribLocation(this.tileProgram, "vertTexCoord")
      
      gl.vertexAttribPointer(
         positionAttribLocation, // Attribute location
         2, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         0 // Offset from the beginning of a single vertex to this attribute
      );
      gl.vertexAttribPointer(
         texCoordAttribLocation, // Attribute location
         2, // Number of elements per attribute
         gl.FLOAT, // Type of elements
         false,
         4 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
         2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
      );

      // Enable the attributes
      gl.enableVertexAttribArray(positionAttribLocation);
      gl.enableVertexAttribArray(texCoordAttribLocation);

      const texture = getTexture(tileTypeInfo.textureSource);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.activeTexture(gl.TEXTURE0)

      gl.useProgram(this.tileProgram);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
   }
}

export default Board;