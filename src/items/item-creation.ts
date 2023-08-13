import { ItemInfo, ItemType, ITEM_INFO_RECORD, InventoryData } from "webgl-test-shared";
import FoodItem from "./FoodItem";
import Item, { Inventory, ItemSlots } from "./Item";
import PlaceableItem from "./PlaceableItem";
import ArmourItem from "./ArmourItem";

type GenericItem<T extends ItemType> = new (itemType: T, count: number, id: number, itemInfo: ItemInfo<T>) => Item;

const ITEM_CLASS_RECORD: { [T in ItemType]: () => GenericItem<T> } = {
   wood: () => Item,
   workbench: () => PlaceableItem,
   wooden_sword: () => Item,
   wooden_axe: () => Item,
   wooden_pickaxe: () => Item,
   berry: () => FoodItem,
   raw_beef: () => FoodItem,
   cooked_beef: () => FoodItem,
   rock: () => Item,
   stone_sword: () => Item,
   stone_axe: () => Item,
   stone_pickaxe: () => Item,
   leather: () => Item,
   leather_backpack: () => Item,
   cactus_spine: () => Item,
   yeti_hide: () => Item,
   frostcicle: () => Item,
   slimeball: () => Item,
   eyeball: () => Item,
   flesh_sword: () => Item,
   tribe_totem: () => PlaceableItem,
   tribe_hut: () => PlaceableItem,
   barrel: () => PlaceableItem,
   frost_armour: () => ArmourItem,
   campfire: () => PlaceableItem,
   furnace: () => PlaceableItem
};

export function createItem(itemType: ItemType, count: number, id: number): Item {
   const itemInfoEntry = ITEM_INFO_RECORD[itemType];

   const itemClass = ITEM_CLASS_RECORD[itemType]() as GenericItem<ItemType>;
   return new itemClass(itemType, count, id, itemInfoEntry);
}

export function createInventoryFromData(inventoryData: InventoryData): Inventory {
   const itemSlots: ItemSlots = {};
   for (const [itemSlot, itemData] of Object.entries(inventoryData.itemSlots)) {
      const item = createItem(itemData.type, itemData.count, itemData.id);
      itemSlots[Number(itemSlot)] = item;
   }
   
   const inventory: Inventory = {
      itemSlots: itemSlots,
      width: inventoryData.width,
      height: inventoryData.height,
      inventoryName: inventoryData.inventoryName
   };

   return inventory;
}