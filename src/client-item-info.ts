import { ItemType } from "webgl-test-shared";

export type ClientItemInfo = {
   readonly textureSrc: string;
   readonly name: string;
   readonly description: string;
}

const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo> = {
   wood: {
      textureSrc: "wood.png",
      name: "Wood",
      description: "A common material used in crafting many things."
   },
   wooden_sword: {
      textureSrc: "wooden-sword.png",
      name: "Wooden Sword",
      description: "The splinters hurt you as much as the blade hurts the enemy."
   },
   wooden_axe: {
      textureSrc: "wooden-axe.png",
      name: "Wooden Axe",
      description: ""
   },
   wooden_pickaxe: {
      textureSrc: "wooden-pickaxe.png",
      name: "Wooden Pickaxe",
      description: ""
   },
   berry: {
      textureSrc: "raw-beef.png",
      name: "Berry",
      description: "Provides little sustenance, but can be used in a pinch."
   },
   raw_beef: {
      textureSrc: "raw-beef.png",
      name: "Raw Beef",
      description: "The raw mutilated flesh of a deceased cow - would not recommend eating."
   },
   cooked_beef: {
      textureSrc: "raw-beef.png",
      name: "Cooked Beef",
      description: "A hearty meal. Could use some seasoning."
   },
   workbench: {
      textureSrc: "workbench.png",
      name: "Workbench",
      description: "The first crafting station available, able to craft many more complex recipes."
   },
   rock: {
      textureSrc: "rock.png",
      name: "Rock",
      description: "This Grug rock. No hurt or face wrath of Grug."
   },
   stone_sword: {
      textureSrc: "stone-sword.png",
      name: "Stone Sword",
      description: ""
   },
   stone_axe: {
      textureSrc: "stone-axe.png",
      name: "Stone Axe",
      description: ""
   },
   stone_pickaxe: {
      textureSrc: "stone-pickaxe.png",
      name: "Stone Pickaxe",
      description: ""
   },
   leather: {
      textureSrc: "leather.png",
      name: "Leather",
      description: ""
   },
   leather_backpack: {
      textureSrc: "leather-backpack.png",
      name: "Leather Backpack",
      description: "Allows you to hold more items."
   }
};

export default CLIENT_ITEM_INFO_RECORD