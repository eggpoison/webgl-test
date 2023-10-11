import Board from "./Board";
import Camera from "./Camera";
import { halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "./webgl";

let ctx: CanvasRenderingContext2D;

const NAMETAG_Y_OFFSET = 21;

export function createTextCanvasContext(): void {
   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;

   ctx = textCanvas.getContext("2d")!;
}

const getXPosInCamera = (x: number): number => {
   return (x - Camera.position.x) * Camera.zoom + halfWindowWidth;
}
const getYPosInCamera = (y: number): number => {
   return (-y + Camera.position.y) * Camera.zoom + halfWindowHeight;
}

export function renderPlayerNames(): void {
   // Clear the canvas
   ctx.fillStyle = "transparent";
   ctx.clearRect(0, 0, windowWidth, windowHeight);

   for (const player of Board.players) {
      // Calculate position in camera
      const cameraX = getXPosInCamera(player.renderPosition.x);
      const cameraY = getYPosInCamera(player.renderPosition.y + NAMETAG_Y_OFFSET);

      ctx.fillStyle = "#000";
      ctx.font = "400 20px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const width = ctx.measureText(player.username).width;

      // Draw text outline
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#000";
      ctx.strokeText(player.username, cameraX - width / 2, cameraY);
      
      // Draw text
      ctx.fillStyle = "#fff";
      ctx.fillText(player.username, cameraX - width / 2, cameraY);
   }
}