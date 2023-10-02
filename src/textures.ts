import { gl } from "./webgl";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { TILE_TYPE_RENDER_INFO_RECORD } from "./tile-type-render-info";
import { imageIsLoaded } from "./utils";

let TEXTURES: { [key: string]: WebGLTexture } = {};

const TEXTURE_SOURCES: Array<string> = [
   "ambient-occlusion/2edge1corner.png",
   "ambient-occlusion/2edge-2.png",
   "ambient-occlusion/1edge.png",
   "ambient-occlusion/2edge.png",
   "ambient-occlusion/1corner.png",
   "ambient-occlusion/2corner.png",
   "ambient-occlusion/3corner.png",
   "ambient-occlusion/4corner.png",
   "ambient-occlusion/1edge1corner.png",
   "ambient-occlusion/1edge2corner.png",
   "ambient-occlusion/2corner-2.png",
   "ambient-occlusion/3edge.png",
   "ambient-occlusion/4edge.png",
   "tiles/water-base.png",
   "tiles/water-noise.png",
   "tiles/gravel.png",
   "tiles/water-rock-large.png",
   "tiles/water-rock-small.png",
   "tiles/river-stepping-stone-small.png",
   "tiles/river-stepping-stone-medium.png",
   "tiles/river-stepping-stone-large.png",
   "tiles/water-foam.png",
   "tiles/river-bed-highlights-1.png",
   "tiles/river-bed-highlights-2.png",
   "tiles/river-bed-highlights-3.png",
   "miscellaneous/particle-texture-atlas.png",
   "miscellaneous/gravel-noise-texture.png",
];

export const TEXTURE_IMAGE_RECORD: Record<string, HTMLImageElement> = {};

const textureSourceIsAlreadyIncluded = (src: string): boolean => {
   return TEXTURE_SOURCES.includes(src);
}

export function loadTextures(): Promise<void> {
   return new Promise(async resolve => {
      // Add solid tile textures
      for (const tileTypeInfo of Object.values(TILE_TYPE_RENDER_INFO_RECORD)) {
         if (!textureSourceIsAlreadyIncluded(tileTypeInfo.textureSource)) {
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

         TEXTURE_IMAGE_RECORD[textureSource] = image;
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