export function imageIsLoaded(image: HTMLImageElement): Promise<boolean> {
   return new Promise(resolve => {
      image.addEventListener("load", () => {
         resolve(true);
      });
   });
}

const isDevBool = !process.env.NODE_ENV || process.env.NODE_ENV === "development";

/**
 * Checks if the game is in development mode.
 * @returns If the game is in development mode.
 */
export function isDev(): boolean {
   return isDevBool;
}

export const ADJACENT_OFFSETS = [
   [0, 0],
   [-1, 0],
   [0, -1],
   [-1, -1]
];

export const NEIGHBOUR_OFFSETS = [
   [1, 0],
   [-1, 0],
   [0, -1],
   [-1, -1],
   [1, 1],
   [-1, 1],
   [0, 1],
   [1, -1]
];