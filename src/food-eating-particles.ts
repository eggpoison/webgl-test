import { ItemType, randItem } from "webgl-test-shared";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";

export type FoodEatingParticleColour = readonly [r: number, g: number, b: number, a: number];

let FOOD_EATING_PARTICLE_COLOURS: Record<ItemType, ReadonlyArray<FoodEatingParticleColour>>;

export function generateFoodEatingParticleColours(): void {
   const canvas = document.createElement("canvas");
   canvas.width = 16;
   canvas.height = 16;
   const temporaryCanvas = canvas.getContext("2d", { willReadFrequently: true });

   if (temporaryCanvas === null) {
      throw new Error("Temporary canvas used for creating particle colours was null");
   }

   const record: Partial<Record<ItemType, ReadonlyArray<FoodEatingParticleColour>>> = {};
   
   for (const itemType of Object.values(ItemType).filter(itemType => typeof itemType === "number") as ReadonlyArray<ItemType>) {
      const textureSource = CLIENT_ITEM_INFO_RECORD[itemType].textureSource;
      const imageSource = require("./images/" + textureSource);

      const img = document.createElement("img");
      img.src = imageSource;

      img.addEventListener("load", () => {
         temporaryCanvas.drawImage(img, 0, 0, 16, 16);

         const imageData = temporaryCanvas.getImageData(0, 0, 16, 16);

         // Extract colour data from the image data
         const colours = new Array<FoodEatingParticleColour>();
         for (let i = 0; i <= imageData.data.length - 1; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];

            // Only add opaque/solid pixels
            if (a > 0) {
               colours.push([r, g, b, a]);
            }
         }

         if (colours.length === 0) {
            throw new Error(`Couldn't find any valid particle colours for item type '${ItemType[itemType]}'.`);
         }

         record[itemType] = colours;
      });
   }

   FOOD_EATING_PARTICLE_COLOURS = record as Record<ItemType, ReadonlyArray<FoodEatingParticleColour>>;
}

export function getRandomFoodEatingParticleColour(itemType: ItemType): FoodEatingParticleColour {
   return randItem(FOOD_EATING_PARTICLE_COLOURS[itemType]);
}