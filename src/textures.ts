import { gl } from ".";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { TILE_TYPE_RENDER_INFO_RECORD } from "./tile-type-render-info";
import { imageIsLoaded } from "./utils";

let TEXTURES: { [key: string]: WebGLTexture } = {};

const TEXTURE_SOURCES: Array<string> = [
   "entities/cow/cow-body-1.png",
   "entities/cow/cow-head-1.png",
   "entities/cow/cow-body-2.png",
   "entities/cow/cow-head-2.png",
   "entities/boulder.png",
   "entities/yeti.png",
   "entities/snowberry-bush.png"
]

const textureSourceIsAlreadyIncluded = (src: string): boolean => {
   return TEXTURE_SOURCES.includes(src);
}

export function loadTextures(): Promise<void> {
   return new Promise(async resolve => {
      // Add solid tile textures
      for (const tileTypeInfo of Object.values(TILE_TYPE_RENDER_INFO_RECORD)) {
         if (!tileTypeInfo.isLiquid && !textureSourceIsAlreadyIncluded(tileTypeInfo.textureSource)) {
            TEXTURE_SOURCES.push(`tiles/${tileTypeInfo.textureSource}`);
         }
      }

      // Add item textures
      for (const clientItemInfo of Object.values(CLIENT_ITEM_INFO_RECORD)) {
         TEXTURE_SOURCES.push(`items/${clientItemInfo.textureSrc}`);
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
   if (!TEXTURES.hasOwnProperty(textureSource)) {
      throw new Error(`Couldn't find texture with source '${textureSource}'`);
   }
   return TEXTURES[textureSource];
}