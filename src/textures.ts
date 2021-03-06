import { gl } from ".";
import { TILE_TYPE_INFO_RECORD } from "./tile-type-info";
import { imageIsLoaded } from "./utils";

let TEXTURES: { [key: string]: WebGLTexture } = {};

const TEXTURE_SOURCES = new Array<string>();

export function loadTextures(): Promise<void> {
   return new Promise(async resolve => {
      // Add solid tile textures
      for (const tileTypeInfo of Object.values(TILE_TYPE_INFO_RECORD)) {
         if (!tileTypeInfo.isLiquid && !TEXTURE_SOURCES.includes(tileTypeInfo.textureSource)) {
            TEXTURE_SOURCES.push(tileTypeInfo.textureSource);
         }
      }

      for (const textureSource of TEXTURE_SOURCES) {
         // Load the image
         const image = new Image();
         image.src = require("./images/" + textureSource);

         // Create texture from the image once it is loaded
         await imageIsLoaded(image).then(() => {
            const texture = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            // Set parameters
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      
            gl.bindTexture(gl.TEXTURE_2D, null);
            
            TEXTURES[textureSource] = texture;
         });
      }
      
      resolve();
   });
}

export function getTexture(textureSource: string): WebGLTexture {
   return TEXTURES[textureSource];
}