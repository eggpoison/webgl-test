import { useCallback, useEffect, useRef, useState } from "react";
import { canCraftRecipe, CraftingRecipe, CraftingStation, ItemType, SETTINGS } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import Client from "../../../client/Client";
import Player from "../../../entities/Player";
import Item from "../../../items/Item";
import { addKeyListener } from "../../../keyboard-input";
import { windowHeight } from "../../../webgl";
import { setHeldItemVisualPosition } from "../HeldItem";
import ItemSlot from "../ItemSlot";

const CRAFTING_STATION_TEXTURE_SOURCE_RECORD: Record<CraftingStation, string> = {
   workbench: "workbench.png"
}

interface RecipeViewerProps {
   readonly recipe: CraftingRecipe | null;
   readonly hoverPosition: [number, number];
   readonly craftingMenuHeight: number;
}

const RecipeViewer = ({ recipe, hoverPosition, craftingMenuHeight }: RecipeViewerProps) => {
   const recipeViewerRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      if (recipeViewerRef.current !== null) {
         const top = (windowHeight - craftingMenuHeight) / 2;
         recipeViewerRef.current.style.top = (hoverPosition[1] - top) + "px";
      }
   }, [hoverPosition, craftingMenuHeight]);

   if (recipe === null) return null;
   
   return <div className="recipe-viewer" ref={recipeViewerRef}>
      <div className="header">
         <img className="recipe-product-icon" src={require("../../../images/items/" + CLIENT_ITEM_INFO_RECORD[recipe.product].textureSrc)} alt="" />
         <div className="recipe-product-name">{CLIENT_ITEM_INFO_RECORD[recipe.product].name}</div>
      </div>

      <ul className="ingredients">
         {(Object.entries(recipe.ingredients) as unknown as ReadonlyArray<[ItemType, number]>).map(([ingredientType, ingredientCount]: [ItemType, number], i: number) => {
            return <li className="ingredient" key={i}>
               <img className="ingredient-icon" src={require("../../../images/items/" + CLIENT_ITEM_INFO_RECORD[ingredientType].textureSrc)} alt="" />
               <span className="ingredient-count">x{ingredientCount}</span>
            </li>;
         })}
      </ul>

      <div className="splitter"></div>

      <div className="caption">Click to open</div>
   </div>;
}

const RECIPE_BROWSER_WIDTH = 3;
const MIN_RECIPE_BROWSER_HEIGHT = 6;

export let setCraftingMenuAvailableRecipes: (craftingRecipes: Array<CraftingRecipe>) => void;
export let setCraftingMenuAvailableCraftingStations: (craftingStations: Set<CraftingStation>) => void;
export let CraftingMenu_setCraftingMenuOutputItem: (craftingOutputItem: Item | null) => void;

export let craftingMenuIsOpen: () => boolean;

let toggleCraftingMenu: () => void;

const CraftingMenu = () => {
   const [isVisible, setIsVisible] = useState(false);

   const [availableRecipes, setAvailableRecipes] = useState(new Array<CraftingRecipe>());
   const [availableCraftingStations, setAvailableCraftingStations] = useState(new Set<CraftingStation>());
   const [craftingOutputItem, setCraftingOutputItem] = useState<Item | null>(null);

   const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
   
   const craftableRecipes = useRef<Array<CraftingRecipe>>([]);
   const [hoveredRecipe, setHoveredRecipe] = useState<CraftingRecipe | null>(null);
   const [hoverPosition, setHoverPosition] = useState<[number, number] | null>(null);
   const hasLoaded = useRef(false);
   const craftingMenuRef = useRef<HTMLDivElement | null>(null);
   const craftingMenuHeightRef = useRef<number | null>(null);

   const onCraftingMenuRefChange = useCallback((node: HTMLDivElement | null) => {
      if (node !== null) {
         craftingMenuRef.current = node;
         craftingMenuHeightRef.current = craftingMenuRef.current.offsetHeight;
      }
   }, []);

   const selectRecipe = (recipe: CraftingRecipe): void => {
      setSelectedRecipe(recipe);
   }

   const craftRecipe = useCallback((): void => {
      if (selectedRecipe === null || !craftableRecipes.current.includes(selectedRecipe)) {
         return;
      }

      Client.sendCraftingPacket(selectedRecipe);
   }, [selectedRecipe, craftableRecipes]);

   const hoverRecipe = (recipe: CraftingRecipe, e: MouseEvent): void => {
      setHoveredRecipe(recipe);
      setHoverPosition([e.clientX, e.clientY]);
   }

   const unhoverRecipe = (): void => {
      setHoveredRecipe(null);
   }

   const mouseMove = (e: MouseEvent): void => {
      setHoverPosition([e.clientX, e.clientY]);
   }

   const pickUpCraftingOutputItem = (e: MouseEvent): void => {
      // Items can only be picked up while the crafting menu is open
      if (!craftingMenuIsOpen()) return;

      if (e.button !== 0) return;

      // Don't pick up the item if there is already a held item
      if (Player.heldItem !== null) return;

      Client.sendItemHoldPacket("craftingOutput", 1);
      
      setHeldItemVisualPosition(e.clientX, e.clientY);
   }

   const throwHeldItem = (): void => {
      if (Player.instance !== null) {
         Client.sendThrowHeldItemPacket(Player.instance.rotation);
      }
   }

   // Find which of the available recipes can be crafted
   useEffect(() => {
      const craftableRecipesArray = new Array<CraftingRecipe>();
      for (const recipe of availableRecipes) {
         if (canCraftRecipe(Player.hotbarInventory, recipe, SETTINGS.INITIAL_PLAYER_HOTBAR_SIZE)) {
            craftableRecipesArray.push(recipe);
         }
      }

      craftableRecipes.current = craftableRecipesArray;
   }, [availableRecipes]);

   useEffect(() => {
      if (selectedRecipe !== null && !availableRecipes.includes(selectedRecipe)) {
         setSelectedRecipe(null);
      }
   }, [availableRecipes, selectedRecipe]);

   useEffect(() => {
      if (!hasLoaded.current) {
         // Create the key listener for opening the crafting menu
         addKeyListener("e", () => toggleCraftingMenu());

         hasLoaded.current = true;
      }

      setCraftingMenuAvailableRecipes = (recipes: Array<CraftingRecipe>): void => {
         setAvailableRecipes(recipes);
      }

      setCraftingMenuAvailableCraftingStations = (craftingStations: Set<CraftingStation>): void => {
         setAvailableCraftingStations(craftingStations);
      }

      CraftingMenu_setCraftingMenuOutputItem = (craftingOutputItem: Item | null): void => {
         setCraftingOutputItem(craftingOutputItem);
      }
   }, []);

   useEffect(() => {
      toggleCraftingMenu = (): void => {
         if (Player.isDead()) return;

         if (isVisible) {
            // Hide the crafting menu
            setIsVisible(false);
            setHoveredRecipe(null);
            setHoverPosition(null);

            // If there is a held item, throw it out
            if (Player.heldItem !== null) {
               throwHeldItem();
            }
         } else {
            // Show the crafting menu
            setIsVisible(true);
         }
      }

      craftingMenuIsOpen = (): boolean => {
         return isVisible;
      }
   }, [isVisible]);

   if (!isVisible) return null;

   // Create the recipe browser
   const recipeBrowser = new Array<JSX.Element>();
   for (let i = 0; i < MIN_RECIPE_BROWSER_HEIGHT; i++) {
      
      // Create the item slots for the row
      const itemSlots = new Array<JSX.Element>();
      for (let j = 0; j < RECIPE_BROWSER_WIDTH; j++) {
         let itemSlotIndex = i * RECIPE_BROWSER_WIDTH + j;

         if (itemSlotIndex <= availableRecipes.length - 1) {
            const recipe = availableRecipes[itemSlotIndex];
            const isCraftable = craftableRecipes.current.includes(recipe);
            
            const imageSrc = require("../../../images/items/" + CLIENT_ITEM_INFO_RECORD[recipe.product].textureSrc);
            itemSlots.push(
               <ItemSlot onMouseOver={(e) => hoverRecipe(recipe, e)} onMouseOut={() => unhoverRecipe()} onMouseMove={e => mouseMove(e)} className={isCraftable ? "craftable" : undefined} isSelected={recipe === selectedRecipe} onClick={() => selectRecipe(recipe)} picturedItemImageSrc={imageSrc} itemCount={recipe.yield !== 1 ? recipe.yield : undefined} key={j} />
            );
         } else {
            itemSlots.push(
               <ItemSlot isSelected={false} key={j} />
            );
         }
      }
      
      // Add the row
      recipeBrowser.push(
         <div className="item-row" key={i}>
            {itemSlots}
         </div>
      );
   }
   
   return <div id="crafting-menu" className="inventory-container" ref={onCraftingMenuRefChange}>
      <div className="available-crafting-stations">
         {Array.from(availableCraftingStations).map((craftingStationType: CraftingStation, i: number) => {
            return <img className="crafting-station-image" src={require("../../../images/items/" + CRAFTING_STATION_TEXTURE_SOURCE_RECORD[craftingStationType])} key={i} alt="" />
         })}
      </div>
      
      <div className="recipe-browser">
         {recipeBrowser}
      </div>

      <div className="crafting-area">
         {selectedRecipe !== null ? <>
            <div className="header">
               <div className="recipe-product-name">{CLIENT_ITEM_INFO_RECORD[selectedRecipe.product].name}</div>
               <img src={require("../../../images/items/" + CLIENT_ITEM_INFO_RECORD[selectedRecipe.product].textureSrc)} className="recipe-product-icon" alt="" />
            </div>

            <div className="content">
               <div className="recipe-product-description">{CLIENT_ITEM_INFO_RECORD[selectedRecipe.product].description}</div>

               <div className="ingredients-title">INGREDIENTS</div>
               <ul className="ingredients">
                  {(Object.entries(selectedRecipe.ingredients) as Array<[ItemType, number]>).map(([ingredientType, ingredientCount]: [ItemType, number], i: number) => {
                     const numIngredientsAvailable = Player.getNumItemType(ingredientType);
                     const hasEnoughIngredients = numIngredientsAvailable >= selectedRecipe.ingredients[ingredientType]!;
                     
                     return <li className="ingredient" key={i}>
                        <img src={require("../../../images/items/" + CLIENT_ITEM_INFO_RECORD[ingredientType].textureSrc)} className="ingredient-icon" alt="" />
                        <span className={`ingredient-count${!hasEnoughIngredients ? " not-enough" : ""}`}>x{ingredientCount}</span>
                     </li>;
                  })}
               </ul>
            </div>

            <div className="bottom">
               <button onClick={() => craftRecipe()} className={`craft-button${craftableRecipes.current.includes(selectedRecipe) ? " craftable" : ""}`}>CRAFT</button>
               {craftingOutputItem !== null ? (
                  <ItemSlot onMouseDown={e => pickUpCraftingOutputItem(e)} picturedItemImageSrc={require("../../../images/items/" + CLIENT_ITEM_INFO_RECORD[craftingOutputItem.type].textureSrc)} itemCount={craftingOutputItem.count} className="crafting-output" isSelected={false} />
               ) : (
                  <ItemSlot className="crafting-output" isSelected={false} />
               )}
            </div>
         </> : <>
            <div className="select-message">&#40;Select a recipe to view&#41;</div>
         </>}
      </div>

      <RecipeViewer recipe={hoveredRecipe} hoverPosition={hoverPosition!} craftingMenuHeight={craftingMenuHeightRef.current!} />
   </div>;
}

export default CraftingMenu;