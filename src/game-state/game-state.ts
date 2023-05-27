import { ItemSlot, ItemSlots } from "../items/Item";

/** Information about the game and player. */
abstract class GameState {
   /** Whether the instance player is eating. */
   public playerIsEating: boolean = false;
   
   /** Whether the instance player is placing an entity. */
   public playerIsPlacingEntity: boolean = false;

   /** Slot number of the player's currently selected item slot. */
   public selectedHotbarItemSlot: number = 1;

   /** Items in the player's hotbar. */
   public hotbarItemSlots: ItemSlots = {};

   /** Items in the player's backpack. */
   public backpackItemSlots: ItemSlots = {};

   /** Item in the player's backpack item slot. */
   public backpackItemSlot: ItemSlot = null;

   /** Item in the player's crafting output item slot. */
   public craftingOutputItemSlot: ItemSlot = null;

   /** Item held by the player. */
   public heldItemSlot: ItemSlot = null;
}

export default GameState;