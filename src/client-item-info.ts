import { ItemType } from "webgl-test-shared";

export type ClientItemInfo = {
   readonly textureSource: string;
   readonly name: string;
   readonly description: string;
}

const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo> = {
   [ItemType.wood]: {
      textureSource: "items/wood.png",
      name: "Wood",
      description: "A common material used in crafting many things."
   },
   [ItemType.wooden_sword]: {
      textureSource: "items/wooden-sword.png",
      name: "Wooden Sword",
      description: "The splinters hurt you as much as the blade hurts the enemy."
   },
   [ItemType.wooden_axe]: {
      textureSource: "items/wooden-axe.png",
      name: "Wooden Axe",
      description: ""
   },
   [ItemType.wooden_pickaxe]: {
      textureSource: "items/wooden-pickaxe.png",
      name: "Wooden Pickaxe",
      description: ""
   },
   [ItemType.berry]: {
      textureSource: "items/berry.png",
      name: "Berry",
      description: "Provides little sustenance, but can be used in a pinch."
   },
   [ItemType.raw_beef]: {
      textureSource: "items/raw-beef.png",
      name: "Raw Beef",
      description: "The raw mutilated flesh of a deceased cow - would not recommend eating."
   },
   [ItemType.cooked_beef]: {
      textureSource: "items/cooked-beef.png",
      name: "Cooked Beef",
      description: "A hearty meal. Could use some seasoning."
   },
   [ItemType.workbench]: {
      textureSource: "items/workbench.png",
      name: "Workbench",
      description: "The first crafting station available, able to craft many more complex recipes."
   },
   [ItemType.rock]: {
      textureSource: "items/rock.png",
      name: "Rock",
      description: "This Grug rock. No hurt or face wrath of Grug."
   },
   [ItemType.stone_sword]: {
      textureSource: "items/stone-sword.png",
      name: "Stone Sword",
      description: ""
   },
   [ItemType.stone_axe]: {
      textureSource: "items/stone-axe.png",
      name: "Stone Axe",
      description: ""
   },
   [ItemType.stone_pickaxe]: {
      textureSource: "items/stone-pickaxe.png",
      name: "Stone Pickaxe",
      description: ""
   },
   [ItemType.leather]: {
      textureSource: "items/leather.png",
      name: "Leather",
      description: ""
   },
   [ItemType.leather_backpack]: {
      textureSource: "items/leather-backpack.png",
      name: "Leather Backpack",
      description: "Allows you to hold more items."
   },
   [ItemType.cactus_spine]: {
      textureSource: "items/cactus-spine.png",
      name: "Cactus Spine",
      description: "It's tough and spiky and gets everywhere."
   },
   [ItemType.yeti_hide]: {
      textureSource: "items/yeti-hide.png",
      name: "Yeti Hide",
      description: "An extremely tough half-frost half-flesh hide."
   },
   [ItemType.frostcicle]: {
      textureSource: "items/frostcicle.png",
      name: "Frostcicle",
      description: "A perfectly preserved ice shard."
   },
   [ItemType.slimeball]: {
      textureSource: "items/slimeball.png",
      name: "Slimeball",
      description: ""
   },
   [ItemType.eyeball]: {
      textureSource: "items/eyeball.png",
      name: "Eyeball",
      description: ""
   },
   [ItemType.flesh_sword]: {
      textureSource: "items/flesh-sword.png",
      name: "Flesh Sword",
      description: ""
   },
   [ItemType.tribe_totem]: {
      textureSource: "items/tribe-totem.png",
      name: "Tribe Totem",
      description: ""
   },
   [ItemType.tribe_hut]: {
      textureSource: "items/tribe-hut.png",
      name: "Tribe Hut",
      description: ""
   },
   [ItemType.barrel]: {
      textureSource: "items/barrel.png",
      name: "Barrel",
      description: ""
   },
   [ItemType.frost_armour]: {
      textureSource: "items/frost-armour.png",
      name: "Frost Armour",
      description: ""
   },
   [ItemType.campfire]: {
      textureSource: "items/campfire.png",
      name: "Campfire",
      description: ""
   },
   [ItemType.furnace]: {
      textureSource: "items/furnace.png",
      name: "Furnace",
      description: ""
   },
   [ItemType.wooden_bow]: {
      textureSource: "items/wooden-bow.png",
      name: "Wooden Bow",
      description: ""
   }
};

export default CLIENT_ITEM_INFO_RECORD