import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { ATLAS_SLOT_SIZE, stitchTextureAtlas } from "./texture-atlas-stitching";

const TEXTURE_SOURCES: Array<string> = [
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
   "entities/tribe-members/plainspeople/plainsperson.png",
   "entities/tribe-members/plainspeople/plainsperson-fist.png",
   "entities/tribe-members/goblins/goblin.png",
   "entities/tribe-members/goblins/goblin-fist.png",
   "entities/tribe-members/goblins/goblin-ear.png",
   "entities/tribe-members/goblins/goblin-warpaint-1.png",
   "entities/tribe-members/goblins/goblin-warpaint-2.png",
   "entities/tribe-members/goblins/goblin-warpaint-3.png",
   "entities/tribe-members/goblins/goblin-warpaint-4.png",
   "entities/tribe-members/goblins/goblin-warpaint-5.png",
   "entities/tribe-members/barbarians/barbarian.png",
   "entities/tribe-members/barbarians/barbarian-fist.png",
   "entities/tribe-members/frostlings/frostling.png",
   "entities/tribe-members/frostlings/frostling-fist.png",
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
   "armour/deepfrost-armour.png",
   "armour/frost-armour.png",
   "armour/meat-suit.png",
   "armour/fishlord-suit.png",
   "entities/campfire/campfire.png",
   "entities/furnace/furnace.png",
   "entities/krumblid/krumblid.png",
   "entities/frozen-yeti/frozen-yeti.png",
   "entities/frozen-yeti/frozen-yeti-head.png",
   "entities/frozen-yeti/frozen-yeti-paw.png",
   "miscellaneous/wooden-bow-charge-1.png",
   "miscellaneous/wooden-bow-charge-2.png",
   "miscellaneous/wooden-bow-charge-3.png",
   "miscellaneous/wooden-bow-charge-4.png",
   "miscellaneous/wooden-bow-charge-5.png",
   "projectiles/rock-spike-small.png",
   "projectiles/rock-spike-medium.png",
   "projectiles/rock-spike-large.png",
   "entities/fish/fish-blue.png",
   "entities/fish/fish-gold.png",
   "entities/fish/fish-red.png",
   "entities/fish/fish-lime.png",
   // @Robustness Right now we need to manually enter these, should instead be automatically added
   "items/large/wooden-sword.png",
   "items/large/wooden-pickaxe.png",
   "items/large/wooden-axe.png",
   "items/large/stone-sword.png",
   "items/large/stone-pickaxe.png",
   "items/large/stone-axe.png",
   "items/large/wooden-bow.png",
   "items/large/deepfrost-sword.png",
   "items/large/deepfrost-axe.png",
   "items/large/deepfrost-pickaxe.png"
];

// Add item textures
for (const clientItemInfo of Object.values(CLIENT_ITEM_INFO_RECORD)) {
   TEXTURE_SOURCES.push(clientItemInfo.entityTextureSource);
}

export let GAME_OBJECT_TEXTURE_ATLAS: WebGLTexture;
export let GAME_OBJECT_TEXTURE_WIDTHS: ReadonlyArray<number>;
export let GAME_OBJECT_TEXTURE_HEIGHTS: ReadonlyArray<number>;
export let GAME_OBJECT_TEXTURE_SLOT_INDEXES: ReadonlyArray<number>;
export let GAME_OBJECT_TEXTURE_ATLAS_SIZE: number;

export async function createGameObjectTextureAtlas(): Promise<void> {
   const atlasInfo = await stitchTextureAtlas(TEXTURE_SOURCES)
   GAME_OBJECT_TEXTURE_ATLAS = atlasInfo.texture;
   GAME_OBJECT_TEXTURE_WIDTHS = atlasInfo.textureWidths;
   GAME_OBJECT_TEXTURE_HEIGHTS = atlasInfo.textureHeights;
   GAME_OBJECT_TEXTURE_ATLAS_SIZE = atlasInfo.atlasSize * ATLAS_SLOT_SIZE;
   GAME_OBJECT_TEXTURE_SLOT_INDEXES = atlasInfo.textureSlotIndexes;
}

export function getGameObjectTextureArrayIndex(textureSource: string): number {
   const textureIndex = TEXTURE_SOURCES.indexOf(textureSource);
   if (textureIndex === -1) {
      throw new Error(`Unknown texture source '${textureSource}'.`);
   }
   return textureIndex;
}