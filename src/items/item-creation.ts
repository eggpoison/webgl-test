import { ItemInfo, ItemType, ITEM_INFO_RECORD } from "webgl-test-shared";
import FoodItem from "./FoodItem";
import Item from "./Item";
import PlaceableItem from "./PlaceableItem";
import ArmourItem from "./ArmourItem";
import BowItem from "./BowItem";

type GenericItem<T extends ItemType> = new (itemType: T, count: number, id: number, itemInfo: ItemInfo<T>) => Item;

// @Cleanup: This file and logic shouldn't even exist. Should just have one Item class which is used for everything,
// like the server, and then one big switch statement to decide logic.

const ITEM_CLASS_RECORD: { [T in ItemType]: () => GenericItem<T> } = {
   [ItemType.wood]: () => Item,
   [ItemType.workbench]: () => PlaceableItem,
   [ItemType.wooden_sword]: () => Item,
   [ItemType.wooden_axe]: () => Item,
   [ItemType.wooden_pickaxe]: () => Item,
   [ItemType.berry]: () => FoodItem,
   [ItemType.raw_beef]: () => FoodItem,
   [ItemType.cooked_beef]: () => FoodItem,
   [ItemType.rock]: () => Item,
   [ItemType.stone_sword]: () => Item,
   [ItemType.stone_axe]: () => Item,
   [ItemType.stone_pickaxe]: () => Item,
   [ItemType.leather]: () => Item,
   [ItemType.leather_backpack]: () => Item,
   [ItemType.cactus_spine]: () => Item,
   [ItemType.yeti_hide]: () => Item,
   [ItemType.frostcicle]: () => Item,
   [ItemType.slimeball]: () => Item,
   [ItemType.eyeball]: () => Item,
   [ItemType.flesh_sword]: () => Item,
   [ItemType.tribe_totem]: () => PlaceableItem,
   [ItemType.tribe_hut]: () => PlaceableItem,
   [ItemType.barrel]: () => PlaceableItem,
   [ItemType.frost_armour]: () => ArmourItem,
   [ItemType.campfire]: () => PlaceableItem,
   [ItemType.furnace]: () => PlaceableItem,
   [ItemType.wooden_bow]: () => BowItem,
   [ItemType.meat_suit]: () => ArmourItem
};

export function createItem(itemType: ItemType, count: number, id: number): Item {
   const itemInfoEntry = ITEM_INFO_RECORD[itemType];

   const itemClass = ITEM_CLASS_RECORD[itemType]() as GenericItem<ItemType>;
   return new itemClass(itemType, count, id, itemInfoEntry);
}