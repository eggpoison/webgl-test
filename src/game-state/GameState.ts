import { Inventory, SETTINGS, TribeMemberAction } from "webgl-test-shared";

/** Information about the game and player. */
abstract class GameState {
   public mainAction = TribeMemberAction.none;
   public offhandAction = TribeMemberAction.none;

   /** Whether the instance player is placing an entity. */
   public playerIsPlacingEntity = false;

   /** Slot number of the player's currently selected item slot. */
   public selectedHotbarItemSlot = 1;

   /** Items in the player's hotbar. */
   public hotbar: Inventory = { itemSlots: {}, width: SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE, height: 1, inventoryName: "hotbar" };

   /** Items in the player's backpack. */
   public backpack: Inventory | null = null;

   /** Stores the item in the player's backpack item slot. */
   public backpackSlot: Inventory = { itemSlots: {}, width: 1, height: 1, inventoryName: "backpackSlot" };

   /** Item in the player's crafting output item slot. */
   public craftingOutputSlot: Inventory | null = null;

   /** Item held by the player. */
   public heldItemSlot: Inventory = { itemSlots: {}, width: 1, height: 1, inventoryName: "heldItemSlot" };

   public armourSlot: Inventory = { itemSlots: {}, width: 1, height: 1, inventoryName: "armourSlot" };

   public offhandInventory: Inventory = { itemSlots: {}, width: 1, height: 1, inventoryName: "offhand" };

   public resetFlags(): void {
      this.mainAction = TribeMemberAction.none;
      this.offhandAction = TribeMemberAction.none;
      this.playerIsPlacingEntity = false;
   }
}

export default GameState;