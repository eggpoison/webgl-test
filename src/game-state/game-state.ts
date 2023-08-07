import { Inventory } from "../items/Item";

/** Information about the game and player. */
abstract class GameState {
   /** Whether the instance player is eating. */
   public playerIsEating: boolean = false;
   
   /** Whether the instance player is placing an entity. */
   public playerIsPlacingEntity: boolean = false;

   /** Slot number of the player's currently selected item slot. */
   public selectedHotbarItemSlot: number = 1;

   /** Items in the player's hotbar. */
   public hotbar: Inventory | null = null;

   /** Items in the player's backpack. */
   public backpack: Inventory | null = null;

   /** Stores the item in the player's backpack item slot. */
   public backpackSlot: Inventory | null = null;

   /** Item in the player's crafting output item slot. */
   public craftingOutputSlot: Inventory | null = null;

   /** Item held by the player. */
   public heldItemSlot: Inventory | null = null;
   // public heldItemSlot: Inventory = {
   //    itemSlots: {},
   //    width: 1,
   //    height: 1,
   //    entityID: -1,
   //    inventoryName: "heldItemSlot"
   // };
}

export default GameState;