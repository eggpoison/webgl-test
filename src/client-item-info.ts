import { ItemType } from "webgl-test-shared";

export type ClientItemInfo = {
   readonly textureSrc: string;
   readonly name: string;
   readonly description: string;
   readonly canBeUsed: boolean;
}

const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo> = {
   wood: {
      textureSrc: "wood.png",
      name: "Wood",
      description: "A common material used in crafting many things.",
      canBeUsed: false
   },
   wooden_sword: {
      textureSrc: "wooden-sword.png",
      name: "Wooden Sword",
      description: "The splinters hurt you as much as the blade hurts the enemy.",
      canBeUsed: false
   },
   wooden_axe: {
      textureSrc: "wooden-axe.png",
      name: "Wooden Axe",
      description: "",
      canBeUsed: false
   },
   berry: {
      textureSrc: "raw-beef.png",
      name: "Berry",
      description: "Provides little sustenance, but can be used in a pinch.",
      canBeUsed: true
   },
   raw_beef: {
      textureSrc: "raw-beef.png",
      name: "Raw Beef",
      description: "The raw mutilated flesh of a deceased cow - would not recommend eating.",
      canBeUsed: true
   },
   cooked_beef: {
      textureSrc: "raw-beef.png",
      name: "Cooked Beef",
      description: "A hearty meal. Could use some seasoning.",
      canBeUsed: true
   },
   workbench: {
      textureSrc: "workbench.png",
      name: "Workbench",
      description: "The first crafting station available, able to craft many more complex recipes.",
      canBeUsed: true
   }
};

export default CLIENT_ITEM_INFO_RECORD