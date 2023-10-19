import { useCallback } from "react";
import { getItemTypeImage } from "../../../client-item-info";
import CookingEntity from "../../../entities/CookingEntity";
import Entity from "../../../entities/Entity"
import ItemSlot from "./ItemSlot";
import { leftClickItemSlot } from "../../../inventory-manipulation";
import { definiteGameState } from "../../../game-state/game-states";
import { COOKING_INGREDIENT_ITEM_TYPES, CookingIngredientItemType, FUEL_SOURCE_ITEM_TYPES, FuelSourceItemType } from "webgl-test-shared";

interface CookingInventoryProps {
   readonly entity: Entity;
}

function assertEntityIsCookingEntity(entity: Entity): asserts entity is CookingEntity {
   if (entity.type !== "campfire" && entity.type !== "furnace") {
      throw new Error("Entity passed into CampfireInventory wasn't a campfire.");
   }
}

const CookingInventory = (props: CookingInventoryProps) => {
   assertEntityIsCookingEntity(props.entity);

   let fuelPicturedItemImageSrc: string | undefined = undefined;
   let fuelItemCount: number | undefined;
   if (props.entity.fuelInventory.itemSlots.hasOwnProperty(1)) {
      const fuel = props.entity.fuelInventory.itemSlots[1];
      fuelPicturedItemImageSrc = getItemTypeImage(fuel.type);
      fuelItemCount = fuel.count;
   }

   let ingredientPicturedItemImageSrc: string | undefined = undefined;
   let ingredientItemCount: number | undefined;
   if (props.entity.ingredientInventory.itemSlots.hasOwnProperty(1)) {
      const ingredient = props.entity.ingredientInventory.itemSlots[1];
      ingredientPicturedItemImageSrc = getItemTypeImage(ingredient.type);
      ingredientItemCount = ingredient.count;
   }

   let outputPicturedItemImageSrc: string | undefined = undefined;
   let outputItemCount: number | undefined;
   if (props.entity.outputInventory.itemSlots.hasOwnProperty(1)) {
      const output = props.entity.outputInventory.itemSlots[1];
      outputPicturedItemImageSrc = getItemTypeImage(output.type);
      outputItemCount = output.count;
   }

   const clickIngredientItemSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && !COOKING_INGREDIENT_ITEM_TYPES.includes(definiteGameState.heldItemSlot.itemSlots[1].type as CookingIngredientItemType)) {
         return;
      }
      leftClickItemSlot(e, (props.entity as CookingEntity).id, (props.entity as CookingEntity).ingredientInventory, 1);
   }, [props.entity]);

   const clickFuelItemSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1) && !FUEL_SOURCE_ITEM_TYPES.includes(definiteGameState.heldItemSlot.itemSlots[1].type as FuelSourceItemType)) {
         return;
      }
      leftClickItemSlot(e, (props.entity as CookingEntity).id, (props.entity as CookingEntity).fuelInventory, 1);
   }, [props.entity]);

   const clickOutputItemSlot = useCallback((e: MouseEvent): void => {
      // Don't let the player place items into the slot
      if (definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1)) {
         return;
      }
      leftClickItemSlot(e, (props.entity as CookingEntity).id, (props.entity as CookingEntity).outputInventory, 1);
   }, [props.entity]);

   const heatingBarProgress = props.entity.heatingProgress !== -1 ? props.entity.heatingProgress : 0;

   return <div id="cooking-inventory" className={`heating-inventory inventory${props.entity.type !== "campfire" ? " with-fuel" : ""}`}>
      <ItemSlot onClick={clickIngredientItemSlot} className="ingredient-inventory" isSelected={false} picturedItemImageSrc={ingredientPicturedItemImageSrc} itemCount={ingredientItemCount} />
      {props.entity.type !== "campfire" ? (
         <ItemSlot onClick={clickFuelItemSlot} className="fuel-inventory" isSelected={false} picturedItemImageSrc={fuelPicturedItemImageSrc} itemCount={fuelItemCount} />
      ) : undefined}
      <ItemSlot onClick={clickOutputItemSlot} className="output-inventory" isSelected={false} picturedItemImageSrc={outputPicturedItemImageSrc} itemCount={outputItemCount} />

      <div className="heating-progress-bar">
         <div className="heating-progress-bar-heat" style={{width: heatingBarProgress * 100 + "%"}}></div>
      </div>
   </div>;
}

export default CookingInventory;