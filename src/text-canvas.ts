import { CircularHitbox } from "webgl-test-shared";
import { windowHeight, windowWidth } from ".";
import Board from "./Board";
import Camera from "./Camera";
import Player from "./entities/Player";

let ctx: CanvasRenderingContext2D;

const NAMETAG_Y_OFFSET = 5;

export function setupTextCanvas(): void {
   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;

   ctx = textCanvas.getContext("2d")!;
}

const getXPosInCamera = (x: number): number => {
   return x - Camera.position.x + window.innerWidth / 2;
}
const getYPosInCamera = (y: number): number => {
   return Camera.position.y + window.innerHeight / 2 - y;
}

export function renderPlayerNames(): void {
   // Clear the canvas
   ctx.fillStyle = "transparent";
   ctx.clearRect(0, 0, windowWidth, windowHeight);

   for (const entity of Object.values(Board.entities)) {
      // If the entity is a player, render a nametag for it
      if (entity instanceof Player && entity !== Player.instance) {
         // Calculate the position of the text
         let drawPosition = entity.renderPosition.copy();
         drawPosition.y += (entity.hitbox as CircularHitbox).radius + NAMETAG_Y_OFFSET;

         // Calculate position in camera
         const cameraX = getXPosInCamera(drawPosition.x);
         const cameraY = getYPosInCamera(drawPosition.y);

         ctx.fillStyle = "#000";
         ctx.font = "400 20px Helvetica";
         ctx.lineJoin = "round";
         ctx.miterLimit = 2;

         const width = ctx.measureText(entity.displayName).width;

         // Draw text outline
         ctx.lineWidth = 6;
         ctx.strokeStyle = "#000";
         ctx.strokeText(entity.displayName, cameraX - width / 2, cameraY);
         
         // Draw text
         ctx.fillStyle = "#fff";
         ctx.fillText(entity.displayName, cameraX - width / 2, cameraY);
      }
   }
}