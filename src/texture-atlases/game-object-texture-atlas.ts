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
   "entities/plainspeople/player.png",
   "entities/plainspeople/worker.png",
   "entities/plainspeople/fist.png",
   "entities/goblins/player.png",
   "entities/goblins/worker.png",
   "entities/goblins/fist.png",
   "entities/goblins/goblin-ear.png",
   "entities/goblins/goblin-warpaint-1.png",
   "entities/goblins/goblin-warpaint-2.png",
   "entities/goblins/goblin-warpaint-3.png",
   "entities/goblins/goblin-warpaint-4.png",
   "entities/goblins/goblin-warpaint-5.png",
   "entities/barbarians/player.png",
   "entities/barbarians/worker.png",
   "entities/barbarians/fist.png",
   "entities/frostlings/player.png",
   "entities/frostlings/worker.png",
   "entities/frostlings/fist.png",
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
   // @Robustness Right now we need to manually enter tools, should instead be automatically added
   "items/large/wooden-sword.png",
   "items/large/wooden-pickaxe.png",
   "items/large/wooden-axe.png",
   "items/large/stone-sword.png",
   "items/large/stone-pickaxe.png",
   "items/large/stone-axe.png",
   "items/large/wooden-bow.png",
   "items/large/deepfrost-sword.png",
   "items/large/deepfrost-axe.png",
   "items/large/deepfrost-pickaxe.png",
   "items/large/flesh-sword.png",
   // @Memory These shouldn't be in the game object texture atlas, should instead be in its own separate atlas
   "decorations/pebble.png",
   "decorations/rock1.png",
   "decorations/sandstone-rock.png",
   "decorations/sandstone-rock-big1.png",
   "decorations/sandstone-rock-big2.png",
   "decorations/black-rock-small.png",
   "decorations/black-rock.png",
   "decorations/snow-pile.png",
   "decorations/flower1.png",
   "decorations/flower2.png",
   "decorations/flower3.png",
   "decorations/flower4.png",
   "entities/berry-snowbush/berry-snowbush-1.png",
   "entities/berry-snowbush/berry-snowbush-2.png",
   "entities/berry-snowbush/berry-snowbush-3.png",
   "entities/berry-snowbush/berry-snowbush-4.png",
   "entities/berry-snowbush/berry-snowbush-5.png",
   "entities/berry-snowbush/berry-snowbush-6.png"
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