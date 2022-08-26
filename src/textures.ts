import { gl } from ".";
import { TILE_TYPE_RENDER_INFO_RECORD } from "./tile-type-render-info";
import { imageIsLoaded } from "./utils";

let TEXTURES: { [key: string]: WebGLTexture } = {};

type TextureSource = {
   readonly folder?: string;
   readonly src: string;
}

const TEXTURE_SOURCES: Array<TextureSource> = [
   {
      folder: "entities",
      src: "cow-head.png"
   },
   {
      folder: "entities",
      src: "cow-body.png"
   },
   {
      folder: "entities",
      src: "boulder.png"
   }
];

const textureSourceIsAlreadyIncluded = (src: string): boolean => {
   return TEXTURE_SOURCES.some(textureSource => textureSource.src === src);
}

export function loadTextures(): Promise<void> {
   return new Promise(async resolve => {
      // Add solid tile textures
      for (const tileTypeInfo of Object.values(TILE_TYPE_RENDER_INFO_RECORD)) {
         if (!tileTypeInfo.isLiquid && !textureSourceIsAlreadyIncluded(tileTypeInfo.textureSource)) {
            TEXTURE_SOURCES.push({
               folder: "tiles",
               src: tileTypeInfo.textureSource
            });
         }
      }

      for (const textureSource of TEXTURE_SOURCES) {
         // Load the image
         const image = new Image();
         const folderPath = typeof textureSource.folder !== "undefined" ? textureSource.folder + "/" : "";
         image.src = require("./images/" + folderPath + textureSource.src);

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
            
            TEXTURES[textureSource.src] = texture;
         });
      }
      
      resolve();
   });
}

export function getTexture(textureSource: string): WebGLTexture {
   return TEXTURES[textureSource];
}