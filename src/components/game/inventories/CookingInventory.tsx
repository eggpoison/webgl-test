import { useCallback } from "react";
import { getItemTypeImage } from "../../../client-item-info";
import CookingEntity from "../../../entities/CookingEntity";
import ItemSlot from "./ItemSlot";
import { leftClickItemSlot } from "../../../inventory-manipulation";
import { definiteGameState } from "../../../game-state/game-states";
import { COOKING_INGREDIENT_ITEM_TYPES, CookingIngredientItemType, EntityType, FUEL_SOURCE_ITEM_TYPES, FuelSourceItemType } from "webgl-test-shared";
import { getSelectedEntity } from "../../../entity-selection";

const CookingInventory = () => {
   const cookingEntity = getSelectedEntity() as CookingEntity;

   let fuelPicturedItemImageSrc: string | undefined = undefined;
   let fuelItemCount: number | undefined;
   if (cookingEntity.fuelInventory.itemSlots.hasOwnProperty(1)) {
      const fuel = cookingEntity.fuelInventory.itemSlots[1];
      fuelPicturedItemImageSrc = getItemTypeImage(fuel.type);
      fuelItemCount = fuel.count;
   }

   let ingredientPicturedItemImageSrc: string | undefined = undefined;
   let ingredientItemCount: number | undefined;
   if (cookingEntity.ingredientInventory.itemSlots.hasOwnProperty(1)) {
      const ingredient = cookingEntity.ingredientInventory.itemSlots[1];
      ingredientPicturedItemImageSrc = getItemTypeImage(ingredient.type);
      ingredientItemCount = ingredient.count;
   }

   let outputPicturedItemImageSrc: string | undefined = undefined;
   let outputItemCount: number | undefined;
   if (cookingEntity.outputInventory.itemSlots.hasOwnProperty(1)) {
      const output = cookingEntity.outputInventory.itemSlots[1];
      outputPicturedItemImageSrc = getItemTypeImage(output.type);
      outputItemCount = output.count;
   }

   const clickIngredientItemSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && !COOKING_INGREDIENT_ITEM_TYPES.includes(definiteGameState.heldItemSlot.itemSlots[1].type as CookingIngredientItemType)) {
         return;
      }
      leftClickItemSlot(e, cookingEntity.id, cookingEntity.ingredientInventory, 1);
   }, [cookingEntity.id, cookingEntity.ingredientInventory]);

   const clickFuelItemSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && !FUEL_SOURCE_ITEM_TYPES.includes(definiteGameState.heldItemSlot.itemSlots[1].type as FuelSourceItemType)) {
         return;
      }
      leftClickItemSlot(e, cookingEntity.id, cookingEntity.fuelInventory, 1);
   }, [cookingEntity]);

   const clickOutputItemSlot = useCallback((e: MouseEvent): void => {
      // Don't let the player place items into the slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1)) {
         return;
      }
      leftClickItemSlot(e, cookingEntity.id, cookingEntity.outputInventory, 1);
   }, [cookingEntity]);

   const heatingBarProgress = cookingEntity.heatingProgress !== -1 ? cookingEntity.heatingProgress : 0;

   return <div id="cooking-inventory" className={`heating-inventory inventory${cookingEntity.type !== EntityType.campfire ? " with-fuel" : ""}`}>
      <ItemSlot onClick={clickIngredientItemSlot} className="ingredient-inventory" isSelected={false} picturedItemImageSrc={ingredientPicturedItemImageSrc} itemCount={ingredientItemCount} />
      {cookingEntity.type !== EntityType.campfire ? (
         <ItemSlot onClick={clickFuelItemSlot} className="fuel-inventory" isSelected={false} picturedItemImageSrc={fuelPicturedItemImageSrc} itemCount={fuelItemCount} />
      ) : undefined}
      <ItemSlot onClick={clickOutputItemSlot} className="output-inventory" isSelected={false} picturedItemImageSrc={outputPicturedItemImageSrc} itemCount={outputItemCount} />

      <div className="heating-progress-bar">
         {/* @Cleanup: Hardcoded */}
         <div className="heating-progress-bar-heat" style={{width: heatingBarProgress * 4.5 * 20 + "px"}}></div>
      </div>
   </div>;
}

export default CookingInventory;