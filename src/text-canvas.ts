import Camera from "./Camera";
import Player from "./entities/Player";
import Game from "./Game";
import { halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "./webgl";

let ctx: CanvasRenderingContext2D;

const NAMETAG_Y_OFFSET = 21;

export function createTextCanvasContext(): void {
   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;

   ctx = textCanvas.getContext("2d")!;
}

const getXPosInCamera = (x: number): number => {
   return x - Camera.position.x + halfWindowWidth;
}
const getYPosInCamera = (y: number): number => {
   return -y + Camera.position.y + halfWindowHeight;
}

export function renderPlayerNames(): void {
   // Clear the canvas
   ctx.fillStyle = "transparent";
   ctx.clearRect(0, 0, windowWidth, windowHeight);

   for (const entity of Object.values(Game.board.entities)) {
      // If the entity is a player, render a nametag for it
      if (entity instanceof Player && entity !== Player.instance) {
         // Calculate the position of the text
         let drawPosition = entity.renderPosition.copy();
         drawPosition.y += NAMETAG_Y_OFFSET;

         // Calculate position in camera
         const cameraX = getXPosInCamera(drawPosition.x);
         const cameraY = getYPosInCamera(drawPosition.y);

         ctx.fillStyle = "#000";
         ctx.font = "400 20px Helvetica";
         ctx.lineJoin = "round";
         ctx.miterLimit = 2;

         const width = ctx.measureText(entity.username).width;

         // Draw text outline
         ctx.lineWidth = 6;
         ctx.strokeStyle = "#000";
         ctx.strokeText(entity.username, cameraX - width / 2, cameraY);
         
         // Draw text
         ctx.fillStyle = "#fff";
         ctx.fillText(entity.username, cameraX - width / 2, cameraY);
      }
   }
}