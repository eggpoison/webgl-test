import { ItemType } from "webgl-test-shared";

export type ClientItemInfo = {
   readonly textureSource: string;
   readonly name: string;
   readonly description: string;
}

const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo> = {
   wood: {
      textureSource: "wood.png",
      name: "Wood",
      description: "A common material used in crafting many things."
   },
   wooden_sword: {
      textureSource: "wooden-sword.png",
      name: "Wooden Sword",
      description: "The splinters hurt you as much as the blade hurts the enemy."
   },
   wooden_axe: {
      textureSource: "wooden-axe.png",
      name: "Wooden Axe",
      description: ""
   },
   wooden_pickaxe: {
      textureSource: "wooden-pickaxe.png",
      name: "Wooden Pickaxe",
      description: ""
   },
   berry: {
      textureSource: "berry.png",
      name: "Berry",
      description: "Provides little sustenance, but can be used in a pinch."
   },
   raw_beef: {
      textureSource: "raw-beef.png",
      name: "Raw Beef",
      description: "The raw mutilated flesh of a deceased cow - would not recommend eating."
   },
   cooked_beef: {
      textureSource: "cooked-beef.png",
      name: "Cooked Beef",
      description: "A hearty meal. Could use some seasoning."
   },
   workbench: {
      textureSource: "workbench.png",
      name: "Workbench",
      description: "The first crafting station available, able to craft many more complex recipes."
   },
   rock: {
      textureSource: "rock.png",
      name: "Rock",
      description: "This Grug rock. No hurt or face wrath of Grug."
   },
   stone_sword: {
      textureSource: "stone-sword.png",
      name: "Stone Sword",
      description: ""
   },
   stone_axe: {
      textureSource: "stone-axe.png",
      name: "Stone Axe",
      description: ""
   },
   stone_pickaxe: {
      textureSource: "stone-pickaxe.png",
      name: "Stone Pickaxe",
      description: ""
   },
   leather: {
      textureSource: "leather.png",
      name: "Leather",
      description: ""
   },
   leather_backpack: {
      textureSource: "leather-backpack.png",
      name: "Leather Backpack",
      description: "Allows you to hold more items."
   },
   cactus_spine: {
      textureSource: "cactus-spine.png",
      name: "Cactus Spine",
      description: "It's tough and spiky and gets everywhere."
   },
   yeti_hide: {
      textureSource: "yeti-hide.png",
      name: "Yeti Hide",
      description: "An extremely tough half-frost half-flesh hide."
   },
   frostcicle: {
      textureSource: "frostcicle.png",
      name: "Frostcicle",
      description: "A perfectly preserved ice shard."
   },
   slimeball: {
      textureSource: "slimeball.png",
      name: "Slimeball",
      description: ""
   },
   eyeball: {
      textureSource: "eyeball.png",
      name: "Eyeball",
      description: ""
   },
   flesh_sword: {
      textureSource: "flesh-sword.png",
      name: "Flesh Sword",
      description: ""
   },
   tribe_totem: {
      textureSource: "tribe-totem.png",
      name: "Tribe Totem",
      description: ""
   },
   tribe_hut: {
      textureSource: "tribe-hut.png",
      name: "Tribe Hut",
      description: ""
   },
   barrel: {
      textureSource: "barrel.png",
      name: "Barrel",
      description: ""
   },
   frost_armour: {
      textureSource: "frost-armour.png",
      name: "Frost Armour",
      description: ""
   },
   campfire: {
      textureSource: "campfire.png",
      name: "Campfire",
      description: ""
   },
   furnace: {
      textureSource: "furnace.png",
      name: "Furnace",
      description: ""
   },
   wooden_bow: {
      textureSource: "wooden-bow.png",
      name: "Wooden Bow",
      description: ""
   }
};

export default CLIENT_ITEM_INFO_RECORD