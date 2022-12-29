import { ItemClassifications, ItemType, ITEM_INFO_RECORD, ITEM_TYPE_RECORD } from "webgl-test-shared";
import Item from "./Item";
import PlaceableItem from "./PlaceableItem";

const ITEM_CLASS_RECORD: { [T in ItemType]: () => new (itemType: T, count: number, iteminfo: ItemClassifications[ReturnType<ITEM_TYPE_RECORD[T]>]) => Item } = {
   wood: () => Item,
   workbench: () => PlaceableItem,
   wooden_sword: () => Item,
   wooden_axe: () => Item,
   berry: () => Item,
   raw_beef: () => Item,
   cooked_beef: () => Item
};

export function createItem(itemType: ItemType, count: number): Item {
   const itemInfoEntry = ITEM_INFO_RECORD[itemType];

   const itemClass = ITEM_CLASS_RECORD[itemType]() as new (itemType: ItemType, count: number, itemInfo: ItemClassifications[ReturnType<ITEM_TYPE_RECORD[ItemType]>]) => Item;
   return new itemClass(itemType, count, itemInfoEntry.info);
}