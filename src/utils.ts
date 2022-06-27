export function imageIsLoaded(image: HTMLImageElement): Promise<boolean> {
   return new Promise(resolve => {
      image.addEventListener("load", () => {
         resolve(true);
      });
   });
}

export function getXPositionInCanvas(x: number): number {
   // Account for the player position
   const relativeX = x;
   
   const canvasX = relativeX / window.innerWidth * 2 - 1;
   return canvasX;
}

export function getYPositionInCanvas(y: number): number {
   // Account for the player position
   const relativeY = y;
   
   const canvasY = relativeY / window.innerHeight * 2 - 1;
   return canvasY;
}