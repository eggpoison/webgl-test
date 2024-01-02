import { ItemType } from "webgl-test-shared";

export type ClientItemInfo = {
   readonly entityTextureSource: string;
   readonly textureSource: string;
   /** Texture source when used as a tool in a tribe members' hand. Empty string if not used as a tool */
   readonly toolTextureSource: string;
   readonly name: string;
   readonly description: string;
}

const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo> = {
   [ItemType.wood]: {
      entityTextureSource: "items/small/wood.png",
      textureSource: "items/large/wood.png",
      toolTextureSource: "",
      name: "Wood",
      description: "A common material used in crafting many things."
   },
   [ItemType.wooden_sword]: {
      entityTextureSource: "items/small/wooden-sword.png",
      textureSource: "items/large/wooden-sword.png",
      toolTextureSource: "items/large/wooden-sword.png",
      name: "Wooden Sword",
      description: "The splinters hurt you as much as the blade hurts the enemy."
   },
   [ItemType.wooden_axe]: {
      entityTextureSource: "items/small/wooden-axe.png",
      textureSource: "items/large/wooden-axe.png",
      toolTextureSource: "items/large/wooden-axe.png",
      name: "Wooden Axe",
      description: ""
   },
   [ItemType.wooden_pickaxe]: {
      entityTextureSource: "items/small/wooden-pickaxe.png",
      textureSource: "items/large/wooden-pickaxe.png",
      toolTextureSource: "items/large/wooden-pickaxe.png",
      name: "Wooden Pickaxe",
      description: ""
   },
   [ItemType.berry]: {
      entityTextureSource: "items/small/berry.png",
      textureSource: "items/large/berry.png",
      toolTextureSource: "",
      name: "Berry",
      description: "Provides little sustenance, but can be used in a pinch."
   },
   [ItemType.raw_beef]: {
      entityTextureSource: "items/small/raw-beef.png",
      textureSource: "items/large/raw-beef.png",
      toolTextureSource: "",
      name: "Raw Beef",
      description: "The raw mutilated flesh of a deceased cow - would not recommend eating."
   },
   [ItemType.cooked_beef]: {
      entityTextureSource: "items/small/cooked-beef.png",
      textureSource: "items/large/cooked-beef.png",
      toolTextureSource: "",
      name: "Cooked Beef",
      description: "A hearty meal. Could use some seasoning."
   },
   [ItemType.workbench]: {
      entityTextureSource: "items/small/workbench.png",
      textureSource: "items/large/workbench.png",
      toolTextureSource: "",
      name: "Workbench",
      description: "The first crafting station available, able to craft many more complex recipes."
   },
   [ItemType.rock]: {
      entityTextureSource: "items/small/rock.png",
      textureSource: "items/large/rock.png",
      toolTextureSource: "",
      name: "Rock",
      description: "This Grug rock. No hurt or face wrath of Grug."
   },
   [ItemType.stone_sword]: {
      entityTextureSource: "items/small/stone-sword.png",
      textureSource: "items/large/stone-sword.png",
      toolTextureSource: "items/large/stone-sword.png",
      name: "Stone Sword",
      description: ""
   },
   [ItemType.stone_axe]: {
      entityTextureSource: "items/small/stone-sword.png",
      textureSource: "items/large/stone-axe.png",
      toolTextureSource: "items/large/stone-axe.png",
      name: "Stone Axe",
      description: ""
   },
   [ItemType.stone_pickaxe]: {
      entityTextureSource: "items/small/stone-pickaxe.png",
      textureSource: "items/large/stone-pickaxe.png",
      toolTextureSource: "items/large/stone-pickaxe.png",
      name: "Stone Pickaxe",
      description: ""
   },
   [ItemType.leather]: {
      entityTextureSource: "items/small/leather.png",
      textureSource: "items/large/leather.png",
      toolTextureSource: "",
      name: "Leather",
      description: ""
   },
   [ItemType.leather_backpack]: {
      entityTextureSource: "items/small/leather-backpack.png",
      textureSource: "items/large/leather-backpack.png",
      toolTextureSource: "",
      name: "Leather Backpack",
      description: "Allows you to hold more items."
   },
   [ItemType.cactus_spine]: {
      entityTextureSource: "items/small/cactus-spine.png",
      textureSource: "items/large/cactus-spine.png",
      toolTextureSource: "",
      name: "Cactus Spine",
      description: "It's tough and spiky and gets everywhere."
   },
   [ItemType.yeti_hide]: {
      entityTextureSource: "items/small/yeti-hide.png",
      textureSource: "items/large/yeti-hide.png",
      toolTextureSource: "",
      name: "Yeti Hide",
      description: "An extremely tough half-frost half-flesh hide."
   },
   [ItemType.frostcicle]: {
      entityTextureSource: "items/small/frostcicle.png",
      textureSource: "items/large/frostcicle.png",
      toolTextureSource: "",
      name: "Frostcicle",
      description: "A perfectly preserved ice shard."
   },
   [ItemType.slimeball]: {
      entityTextureSource: "items/small/slimeball.png",
      textureSource: "items/large/slimeball.png",
      toolTextureSource: "",
      name: "Slimeball",
      description: ""
   },
   [ItemType.eyeball]: {
      entityTextureSource: "items/small/eyeball.png",
      textureSource: "items/large/eyeball.png",
      toolTextureSource: "",
      name: "Eyeball",
      description: ""
   },
   [ItemType.flesh_sword]: {
      entityTextureSource: "items/small/flesh-sword.png",
      textureSource: "items/large/flesh-sword.png",
      toolTextureSource: "items/large/flesh-sword.png",
      name: "Flesh Sword",
      description: ""
   },
   [ItemType.tribe_totem]: {
      entityTextureSource: "items/small/tribe-totem.png",
      textureSource: "items/large/tribe-totem.png",
      toolTextureSource: "",
      name: "Totem",
      description: "Centerpiece of the tribe."
   },
   [ItemType.worker_hut]: {
      entityTextureSource: "items/small/worker-hut.png",
      textureSource: "items/large/worker-hut.png",
      toolTextureSource: "",
      name: "Worker Hut",
      description: ""
   },
   [ItemType.warrior_hut]: {
      entityTextureSource: "items/small/warrior-hut.png",
      textureSource: "items/large/warrior-hut.png",
      toolTextureSource: "",
      name: "Warrior Hut",
      description: ""
   },
   [ItemType.barrel]: {
      entityTextureSource: "items/small/barrel.png",
      textureSource: "items/large/barrel.png",
      toolTextureSource: "",
      name: "Barrel",
      description: ""
   },
   [ItemType.frost_armour]: {
      entityTextureSource: "items/small/frost-armour.png",
      textureSource: "items/large/frost-armour.png",
      toolTextureSource: "",
      name: "Frost Armour",
      description: ""
   },
   [ItemType.campfire]: {
      entityTextureSource: "items/small/campfire.png",
      textureSource: "items/large/campfire.png",
      toolTextureSource: "",
      name: "Campfire",
      description: ""
   },
   [ItemType.furnace]: {
      entityTextureSource: "items/small/furnace.png",
      textureSource: "items/large/furnace.png",
      toolTextureSource: "",
      name: "Furnace",
      description: ""
   },
   [ItemType.wooden_bow]: {
      entityTextureSource: "items/small/wooden-bow.png",
      textureSource: "items/large/wooden-bow.png",
      toolTextureSource: "items/large/wooden-bow.png",
      name: "Wooden Bow",
      description: ""
   },
   [ItemType.meat_suit]: {
      entityTextureSource: "items/small/meat-suit.png",
      textureSource: "items/large/meat-suit.png",
      toolTextureSource: "",
      name: "Meat Suit",
      description: "You think you are Cow, but you are not. You are a mere imitation, a foolish attempt to recreate That which is divine. You will never approach Their divinity."
   },
   [ItemType.deepfrost_heart]: {
      entityTextureSource: "items/small/deepfrost-heart.png",
      textureSource: "items/large/deepfrost-heart.png",
      toolTextureSource: "",
      name: "Deepfrost Heart",
      description: ""
   },
   [ItemType.deepfrost_sword]: {
      entityTextureSource: "items/small/deepfrost-sword.png",
      textureSource: "items/large/deepfrost-sword.png",
      toolTextureSource: "items/large/deepfrost-sword.png",
      name: "Deepfrost Sword",
      description: ""
   },
   [ItemType.deepfrost_pickaxe]: {
      entityTextureSource: "items/small/deepfrost-pickaxe.png",
      textureSource: "items/large/deepfrost-pickaxe.png",
      toolTextureSource: "items/large/deepfrost-pickaxe.png",
      name: "Deepfrost Pickaxe",
      description: ""
   },
   [ItemType.deepfrost_axe]: {
      entityTextureSource: "items/small/deepfrost-axe.png",
      textureSource: "items/large/deepfrost-axe.png",
      toolTextureSource: "items/large/deepfrost-axe.png",
      name: "Deepfrost Axe",
      description: ""
   },
   [ItemType.deepfrost_armour]: {
      entityTextureSource: "items/small/deepfrost-armour.png",
      textureSource: "items/large/deepfrost-armour.png",
      toolTextureSource: "",
      name: "Deepfrost Armour",
      description: ""
   },
   [ItemType.raw_fish]: {
      entityTextureSource: "items/small/raw-fish.png",
      textureSource: "items/large/raw-fish.png",
      toolTextureSource: "",
      name: "Deepfrost Armour",
      description: ""
   },
   [ItemType.cooked_fish]: {
      entityTextureSource: "items/small/cooked-fish.png",
      textureSource: "items/large/cooked-fish.png",
      toolTextureSource: "",
      name: "Deepfrost Armour",
      description: ""
   },
   [ItemType.fishlord_suit]: {
      entityTextureSource: "items/small/fishlord-suit.png",
      textureSource: "items/large/fishlord-suit.png",
      toolTextureSource: "",
      name: "Fish Suit",
      description: ""
   },
   // @Incomplete
   [ItemType.gathering_gloves]: {
      entityTextureSource: "items/small/fishlord-suit.png",
      textureSource: "items/large/fishlord-suit.png",
      toolTextureSource: "",
      name: "Fish Suit",
      description: ""
   },
   // @Incomplete
   [ItemType.throngler]: {
      entityTextureSource: "items/small/fishlord-suit.png",
      textureSource: "items/large/fishlord-suit.png",
      toolTextureSource: "items/large/fishlord-suit.png",
      name: "Fish Suit",
      description: ""
   },
   // @Incomplete
   [ItemType.leather_armour]: {
      entityTextureSource: "items/small/leather-armour.png",
      textureSource: "items/large/leather-armour.png",
      toolTextureSource: "",
      name: "Leather Armour",
      description: ""
   },
   [ItemType.spear]: {
      entityTextureSource: "items/small/spear.png",
      textureSource: "items/large/spear.png",
      toolTextureSource: "items/misc/spear.png",
      name: "Spear",
      description: "Pointy end works best."
   },
   [ItemType.paper]: {
      entityTextureSource: "items/small/paper.png",
      textureSource: "items/large/paper.png",
      toolTextureSource: "",
      name: "Paper",
      description: ""
   },
   [ItemType.research_bench]: {
      entityTextureSource: "items/small/research-bench.png",
      textureSource: "items/large/research-bench.png",
      toolTextureSource: "",
      name: "Research Bench",
      description: ""
   },
   [ItemType.wooden_wall]: {
      entityTextureSource: "items/small/wooden-wall.png",
      textureSource: "items/large/wooden-wall.png",
      toolTextureSource: "",
      name: "Wooden Wall",
      description: ""
   }
};

export function getItemTypeImage(itemType: ItemType): any {
   return require("./images/" + CLIENT_ITEM_INFO_RECORD[itemType].textureSource);
}

export default CLIENT_ITEM_INFO_RECORD;