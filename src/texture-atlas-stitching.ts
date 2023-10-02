import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { imageIsLoaded } from "./utils";
import { gl } from "./webgl";

const INDIVIDUAL_TEXTURE_SOURCES: Array<string> = [
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
   "entities/human/goblin.png",
   "entities/human/goblin-ear.png",
   "entities/human/goblin-warpaint-1.png",
   "entities/human/goblin-warpaint-2.png",
   "entities/human/goblin-warpaint-3.png",
   "entities/human/barbarian.png",
   "entities/human/frostling.png",
   "entities/boulder/boulder1.png",
   "entities/boulder/boulder2.png",
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
   "entities/yeti/yeti.png",
   "entities/yeti/yeti-paw.png",
   "entities/ice-spikes/ice-spikes.png",
   "projectiles/ice-shard.png",
   "projectiles/wooden-arrow.png",
   "entities/snowball/snowball-large.png",
   "entities/snowball/snowball-small.png",
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
   "entities/tribe-totem/goblin-banner.png",
   "entities/tribe-totem/barbarian-banner.png",
   "entities/tribe-totem/plainspeople-banner.png",
   "entities/tribe-totem/frostling-banner.png",
   "entities/tribe-hut/tribe-hut.png",
   "entities/tribe-hut/tribe-hut-door.png",
   "entities/barrel/barrel.png",
   "armour/frost-armour.png",
   "armour/meat-suit.png",
   "entities/campfire/campfire.png",
   "entities/furnace/furnace.png",
   "entities/krumblid/krumblid.png",
   "entities/frozen-yeti/frozen-yeti.png",
   "entities/frozen-yeti/frozen-yeti-head.png",
   "items/wooden-bow-charge-1.png",
   "items/wooden-bow-charge-2.png",
   "items/wooden-bow-charge-3.png",
   "items/wooden-bow-charge-4.png",
   "items/wooden-bow-charge-5.png"
];

// Add item textures
for (const clientItemInfo of Object.values(CLIENT_ITEM_INFO_RECORD)) {
   INDIVIDUAL_TEXTURE_SOURCES.push(clientItemInfo.textureSource);
}

const textureMappings: Record<string, number> = {};
for (let i = 0; i < INDIVIDUAL_TEXTURE_SOURCES.length; i++) {
   textureMappings[INDIVIDUAL_TEXTURE_SOURCES[i]] = i;
}

export const ATLAS_SLOT_SIZE = 16;

export let GAME_OBJECT_TEXTURE_ATLAS: WebGLTexture;

let atlasSize = 1;
let unavailableSlots = new Array<number>();
let textureSlotIndexes = new Array<number>();
const textureWidths = new Array<number>();
const textureHeights = new Array<number>();

const getAvailableSlotIndex = (slotWidth: number, slotHeight: number): number => {
   for (let x = 0; x <= atlasSize - slotWidth; x++) {
      for (let y = 0; y <= atlasSize - slotHeight; y++) {
         // Check availability
         let isAvailable = true;
         for (let cx = x; cx < x + slotWidth; cx++) {
            for (let cy = y; cy < y + slotHeight; cy++) {
               const slotIndex = cy * atlasSize + cx;
               if (unavailableSlots.includes(slotIndex)) {
                  isAvailable = false;
                  break;
               }
            }
         }

         if (isAvailable) {
            return y * atlasSize + x;
         }
      }
   }
   
   return -1;
}

const expand = (): void => {
   const oldAtlasSize = atlasSize;
   atlasSize++;

   // Remap all previous available slots
   const newSlots = new Array<number>();
   for (const slotIndex of unavailableSlots) {
      const width = slotIndex % oldAtlasSize;
      const height = Math.floor(slotIndex / oldAtlasSize);
      newSlots.push(height * atlasSize + width);
   }
   unavailableSlots = newSlots;

   // Remap texture slot indexes
   const newIndexes = new Array<number>();
   for (const slotIndex of textureSlotIndexes) {
      const width = slotIndex % oldAtlasSize;
      const height = Math.floor(slotIndex / oldAtlasSize);
      newIndexes.push(height * atlasSize + width);
   }
   textureSlotIndexes = newIndexes;
}

export async function stitchGameObjectTextureAtlas(): Promise<void> {
   const atlasElement = document.createElement("canvas");
   atlasElement.width = ATLAS_SLOT_SIZE;
   atlasElement.height = ATLAS_SLOT_SIZE;
   const context = atlasElement.getContext("2d")!;

   // Uncomment to see the atlas visually :D
   document.body.appendChild(atlasElement);
   atlasElement.style.position = "absolute";

   let textureImages = new Array<HTMLImageElement>();
   
   for (let i = 0; i < INDIVIDUAL_TEXTURE_SOURCES.length; i++) {
      const textureSource = INDIVIDUAL_TEXTURE_SOURCES[i];
      textureImages[i] = new Image();
      textureImages[i].src = require("./images/" + textureSource);

      await imageIsLoaded(textureImages[i]).then(() => {
         const slotWidth = Math.ceil(textureImages[i].width / ATLAS_SLOT_SIZE);
         const slotHeight = Math.ceil(textureImages[i].height / ATLAS_SLOT_SIZE);

         textureWidths.push(textureImages[i].width);
         textureHeights.push(textureImages[i].height);

         let slotIndex = getAvailableSlotIndex(slotWidth, slotHeight);
         for (; slotIndex === -1; slotIndex = getAvailableSlotIndex(slotWidth, slotHeight)) {
            expand();
            atlasElement.width = ATLAS_SLOT_SIZE * atlasSize;
            atlasElement.height = ATLAS_SLOT_SIZE * atlasSize;
         }

         textureSlotIndexes.push(slotIndex);

         // Add to unavailable slots
         const x = slotIndex % atlasSize;
         const y = Math.floor(slotIndex / atlasSize);
         for (let cx = x; cx < x + slotWidth; cx++) {
            for (let cy = y; cy < y + slotHeight; cy++) {
               unavailableSlots.push(cy * atlasSize + cx);
            }
         }
      });
   }

   // Draw textures once the atlas has been fully expanded
   for (let i = 0; i < INDIVIDUAL_TEXTURE_SOURCES.length; i++) {
      const slotIndex = textureSlotIndexes[i];
      const x = (slotIndex % atlasSize) * ATLAS_SLOT_SIZE;
      const y = Math.floor(slotIndex / atlasSize) * ATLAS_SLOT_SIZE;
      
      const image = textureImages[i];
      const width = textureWidths[i];
      const height = textureHeights[i];
      context.drawImage(image, x, y, width, height);
   }

   // Make atlas image into texture
   const texture = gl.createTexture()!;
   gl.bindTexture(gl.TEXTURE_2D, texture);
   // Set parameters
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasElement);
   gl.bindTexture(gl.TEXTURE_2D, null);
   
   GAME_OBJECT_TEXTURE_ATLAS = texture;
}

export function getAtlasTextureIndex(textureSource: string): number {
   return textureSlotIndexes[textureMappings[textureSource]];
}
export function getAtlasTextureWidth(textureSource: string): number {
   return textureWidths[textureMappings[textureSource]];
}
export function getAtlasTextureHeight(textureSource: string): number {
   return textureHeights[textureMappings[textureSource]];
}
export function getAtlasPixelSize(): number {
   return atlasSize * ATLAS_SLOT_SIZE;
}