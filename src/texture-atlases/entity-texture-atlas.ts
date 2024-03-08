import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { BLUEPRINT_PROGRESS_TEXTURE_SOURCES } from "../entities/BlueprintEntity";
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
   "entities/zombie/fist-1.png",
   "entities/zombie/fist-2.png",
   "entities/zombie/fist-3.png",
   "entities/zombie/fist-4.png",
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
   "projectiles/wooden-bolt.png",
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
   "entities/worker-hut/worker-hut.png",
   "entities/worker-hut/worker-hut-door.png",
   "entities/warrior-hut/warrior-hut.png",
   "entities/warrior-hut/warrior-hut-door.png",
   "entities/barrel/barrel.png",
   // @Robustness: Shouldn't have to hard-code armours and gloves
   "armour/deepfrost-armour.png",
   "armour/frost-armour.png",
   "armour/meat-suit.png",
   "armour/fishlord-suit.png",
   "armour/leather-armour.png",
   "gloves/gathering-gloves.png",
   "entities/campfire/campfire.png",
   "entities/furnace/furnace.png",
   "entities/krumblid/krumblid.png",
   "entities/frozen-yeti/frozen-yeti.png",
   "entities/frozen-yeti/frozen-yeti-head.png",
   "entities/frozen-yeti/frozen-yeti-paw.png",
   // @Robustness: Hardcoded
   "miscellaneous/wooden-bow-charge-1.png",
   "miscellaneous/wooden-bow-charge-2.png",
   "miscellaneous/wooden-bow-charge-3.png",
   "miscellaneous/wooden-bow-charge-4.png",
   "miscellaneous/wooden-bow-charge-5.png",
   "miscellaneous/reinforced-bow-charge-1.png",
   "miscellaneous/reinforced-bow-charge-2.png",
   "miscellaneous/reinforced-bow-charge-3.png",
   "miscellaneous/reinforced-bow-charge-4.png",
   "miscellaneous/reinforced-bow-charge-5.png",
   "miscellaneous/ice-bow-charge-1.png",
   "miscellaneous/ice-bow-charge-2.png",
   "miscellaneous/ice-bow-charge-3.png",
   "miscellaneous/ice-bow-charge-4.png",
   "miscellaneous/ice-bow-charge-5.png",
   "miscellaneous/crossbow-charge-1.png",
   "miscellaneous/crossbow-charge-2.png",
   "miscellaneous/crossbow-charge-3.png",
   "miscellaneous/crossbow-charge-4.png",
   "miscellaneous/crossbow-charge-5.png",
   "projectiles/rock-spike-small.png",
   "projectiles/rock-spike-medium.png",
   "projectiles/rock-spike-large.png",
   "entities/fish/fish-blue.png",
   "entities/fish/fish-gold.png",
   "entities/fish/fish-red.png",
   "entities/fish/fish-lime.png",
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
   "entities/research-bench/research-bench.png",
   "entities/wooden-wall/wooden-wall.png",
   "entities/wooden-wall/wooden-wall-damage-1.png",
   "entities/wooden-wall/wooden-wall-damage-2.png",
   "entities/wooden-wall/wooden-wall-damage-3.png",
   "entities/wooden-wall/wooden-wall-damage-4.png",
   "entities/wooden-wall/wooden-wall-damage-5.png",
   "entities/wooden-wall/wooden-wall-damage-6.png",
   "projectiles/slime-spit-medium.png",
   "projectiles/slime-spit-large.png",
   "entities/wooden-door/wooden-door.png",
   "entities/wooden-door/wooden-door-blueprint-1.png",
   "entities/wooden-door/wooden-door-blueprint-2.png",
   "entities/golem/golem-body-large.png",
   "entities/golem/golem-body-medium.png",
   "entities/golem/golem-body-small.png",
   "entities/golem/golem-body-massive.png",
   "entities/golem/golem-body-tiny.png",
   "entities/golem/eye.png",
   "entities/planter-box/planter-box.png",
   "projectiles/ice-arrow.png",
   "entities/pebblum/pebblum-nose.png",
   "entities/pebblum/pebblum-body.png",
   "entities/wooden-embrasure/wooden-embrasure.png",
   "entities/wooden-embrasure/wooden-embrasure-blueprint-1.png",
   "entities/wooden-embrasure/wooden-embrasure-blueprint-2.png",
   "entities/wooden-embrasure/wooden-embrasure-blueprint-3.png",
   "entities/wooden-floor-spikes/wooden-floor-spikes.png",
   "entities/wooden-wall-spikes/wooden-wall-spikes.png",
   "entities/wall-punji-sticks/wall-punji-sticks.png",
   "entities/floor-punji-sticks/floor-punji-sticks.png",
   "entities/ballista/base.png",
   "entities/ballista/shaft.png",
   "entities/ballista/crossbow.png", // @Incomplete: just for blueprints
   "entities/ballista/crossbow-1.png",
   "entities/ballista/crossbow-2.png",
   "entities/ballista/crossbow-3.png",
   "entities/ballista/crossbow-4.png",
   "entities/ballista/crossbow-5.png",
   "entities/ballista/crossbow-6.png",
   "entities/ballista/crossbow-7.png",
   "entities/ballista/crossbow-8.png",
   "entities/ballista/crossbow-9.png",
   "entities/ballista/crossbow-10.png",
   "entities/ballista/crossbow-11.png",
   "entities/ballista/gear.png",
   "entities/ballista/ammo-box.png",
   "entities/ballista/plate.png",
   "entities/ballista/ammo-warning.png",
   "entities/sling-turret/sling-turret-base.png",
   "entities/sling-turret/sling-turret-plate.png",
   "entities/sling-turret/sling-turret-sling.png",
   "entities/sling-turret/sling-charge-1.png",
   "entities/sling-turret/sling-charge-2.png",
   "entities/sling-turret/sling-charge-3.png",
   "entities/sling-turret/sling-charge-4.png",
   "entities/sling-turret/sling-charge-5.png",
   "entities/sling-turret/base-blueprint-1.png",
   "entities/sling-turret/base-blueprint-2.png",
   "entities/sling-turret/base-blueprint-3.png",
   "entities/sling-turret/base-blueprint-4.png",
   "entities/sling-turret/plate-blueprint-1.png",
   "entities/sling-turret/plate-blueprint-2.png",
   "entities/sling-turret/sling-blueprint-1.png",
   "entities/sling-turret/sling-blueprint-2.png",
   "projectiles/sling-rock.png",
   "projectiles/ballista-rock.png",
   "projectiles/ballista-slimeball.png",
   "projectiles/ballista-frostcicle.png",
   "entities/wooden-tunnel/wooden-tunnel.png"
];

const addTextureSource = (textureSource: string): void => {
   if (!TEXTURE_SOURCES.includes(textureSource)) {
      TEXTURE_SOURCES.push(textureSource);
   }
}

// Add item textures
for (const clientItemInfo of Object.values(CLIENT_ITEM_INFO_RECORD)) {
   addTextureSource(clientItemInfo.entityTextureSource);

   // Add tool item textures
   if (clientItemInfo.toolTextureSource !== "") {
      addTextureSource(clientItemInfo.toolTextureSource);
   }
}

// Add partial blueprint textures
for (const progressTextureInfoArray of Object.values(BLUEPRINT_PROGRESS_TEXTURE_SOURCES)) {
   for (const progressTextureInfo of progressTextureInfoArray) {
      for (const textureSource of progressTextureInfo.progressTextureSources) {
         addTextureSource(textureSource);
      }
   }
}

export const ENTITY_TEXTURE_ATLAS_LENGTH = TEXTURE_SOURCES.length;

export let ENTITY_TEXTURE_ATLAS: WebGLTexture;
let ENTITY_TEXTURE_WIDTHS: ReadonlyArray<number>;
let ENTITY_TEXTURE_HEIGHTS: ReadonlyArray<number>;
export let ENTITY_TEXTURE_SLOT_INDEXES: ReadonlyArray<number>;
export let ENTITY_TEXTURE_ATLAS_SIZE: number;

export async function createEntityTextureAtlas(): Promise<void> {
   const atlasInfo = await stitchTextureAtlas(TEXTURE_SOURCES)
   ENTITY_TEXTURE_ATLAS = atlasInfo.texture;
   ENTITY_TEXTURE_WIDTHS = atlasInfo.textureWidths;
   ENTITY_TEXTURE_HEIGHTS = atlasInfo.textureHeights;
   ENTITY_TEXTURE_ATLAS_SIZE = atlasInfo.atlasSize * ATLAS_SLOT_SIZE;
   ENTITY_TEXTURE_SLOT_INDEXES = atlasInfo.textureSlotIndexes;
}

export function getTextureArrayIndex(textureSource: string): number {
   const textureIndex = TEXTURE_SOURCES.indexOf(textureSource);
   if (textureIndex === -1) {
      throw new Error(`Texture source '${textureSource}' does not exist in the TEXTURE_SOURCES array.`);
   }
   return textureIndex;
}

export function getTextureWidth(textureArrayIndex: number): number {
   return ENTITY_TEXTURE_WIDTHS[textureArrayIndex];
}
export function getTextureHeight(textureArrayIndex: number): number {
   return ENTITY_TEXTURE_HEIGHTS[textureArrayIndex];
}