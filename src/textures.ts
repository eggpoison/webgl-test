import { gl } from "./webgl";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { TILE_TYPE_RENDER_INFO_RECORD } from "./tile-type-render-info";
import { imageIsLoaded } from "./utils";
import { PARTICLE_TEXTURES } from "./rendering/particle-rendering";

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
   "entities/cow/cow-body-1.png",
   "entities/cow/cow-head-1.png",
   "entities/cow/cow-body-2.png",
   "entities/cow/cow-head-2.png",
   "entities/zombie/zombie1.png",
   "entities/zombie/zombie2.png",
   "entities/zombie/zombie3.png",
   "entities/zombie/zombie-golden.png",
   "entities/tombstone/tombstone1.png",
   "entities/tombstone/tombstone2.png",
   "entities/tombstone/tombstone3.png",
   "entities/tree/tree-small.png",
   "entities/tree/tree-large.png",
   "entities/workbench/workbench.png",
   "entities/human/human1.png",
   "entities/boulder/boulder1.png",
   "entities/boulder/boulder2.png",
   "entities/slime/slime.png",
   "entities/human/temp-player.png",
   "entities/berry-bush1.png",
   "entities/berry-bush2.png",
   "entities/berry-bush3.png",
   "entities/berry-bush4.png",
   "entities/berry-bush5.png",
   "entities/berry-bush6.png",
   "entities/cactus/cactus.png",
   "entities/cactus/cactus-limb.png",
   "entities/cactus/cactus-flower-small-1.png",
   "entities/cactus/cactus-flower-small-2.png",
   "entities/cactus/cactus-flower-small-3.png",
   "entities/cactus/cactus-flower-small-4.png",
   "entities/cactus/cactus-flower-large-1.png",
   "entities/cactus/cactus-flower-large-2.png",
   "entities/cactus/cactus-flower-large-3.png",
   "entities/cactus/cactus-flower-large-4.png",
   "entities/cactus/cactus-flower-5.png",
   "entities/yeti.png",
   "entities/ice-spikes/ice-spikes.png",
   "projectiles/ice-shard.png",
   "entities/slime/slime-small-body.png",
   "entities/slime/slime-medium-body.png",
   "entities/slime/slime-large-body.png",
   "entities/slime/slime-small-eye.png",
   "entities/slime/slime-medium-eye.png",
   "entities/slime/slime-large-eye.png",
   "entities/slime/slime-small-shading.png",
   "entities/slime/slime-medium-shading.png",
   "entities/slime/slime-large-shading.png",
   "entities/slime/slime-orb-small.png",
   "entities/slime/slime-orb-medium.png",
   "entities/slime/slime-orb-large.png",
   "entities/slimewisp/slimewisp.png",
   "entities/tribe-totem/tribe-totem.png",
   "entities/tribe-hut/tribe-hut.png",
   "entities/barrel/barrel.png"
];

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

      // Particle textures
      for (const particleTexture of Object.values(PARTICLE_TEXTURES)) {
         if (!textureSourceIsAlreadyIncluded(particleTexture))  {
            TEXTURE_SOURCES.push(particleTexture);
         }
      }

      // Add item textures
      for (const clientItemInfo of Object.values(CLIENT_ITEM_INFO_RECORD)) {
         TEXTURE_SOURCES.push(`items/${clientItemInfo.textureSource}`);
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