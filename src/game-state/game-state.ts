import { ItemSlot, ItemSlots } from "../items/Item";

/** Information about the game and player. */
abstract class GameState {
   /** Whether the instance player is eating. */
   public static playerIsEating: boolean = false;
   
   /** Whether the instance player is placing an entity. */
   public static playerIsPlacingEntity: boolean = false;

   /** Slot number of the player's currently selected item slot. */
   public static selectedHotbarItemSlot: number = 1;

   /** Items in the player's hotbar. */
   public static hotbarItemSlots: ItemSlots = {};

   /** Items in the player's backpack. */
   public static backpackItemSlots: ItemSlots = {};

   /** Item in the player's backpack item slot. */
   public static backpackItemSlot: ItemSlot = null;

   /** Item in the player's crafting output item slot. */
   public static craftingOutputItemSlot: ItemSlot = null;

   /** Item held by the player. */
   public static heldItemSlot: ItemSlot = null;
}

export default GameState;