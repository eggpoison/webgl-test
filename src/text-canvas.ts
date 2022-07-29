import { windowHeight, windowWidth } from ".";
import Board from "./Board";
import Camera from "./Camera";
import Player from "./entities/Player";
import TransformComponent from "./entity-components/TransformComponent";

let ctx: CanvasRenderingContext2D;

export function setupTextCanvas(): void {
   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;

   ctx = textCanvas.getContext("2d")!;
}

export function renderPlayerNames(): void {
   // Clear the canvas
   ctx.fillStyle = "transparent";
   ctx.clearRect(0, 0, windowWidth, windowHeight);

   const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);

         for (const entity of chunk.getEntities()) {
            // Render player nametags
            if (entity instanceof Player && entity !== Player.instance) {
               // Calculate the position of the text
               const position = entity.getComponent(TransformComponent)!.position;
               const x = Camera.getXPositionInCanvas(position.x, "text");
               const y = Camera.getYPositionInCanvas(position.y + Player.RADIUS + 5, "text");

               ctx.fillStyle = "#000";
               ctx.font = "400 20px Helvetica";
               ctx.lineJoin = "round";
               ctx.miterLimit = 2;

               const width = ctx.measureText(entity.name).width;

               // Draw text outline
               ctx.lineWidth = 6;
               ctx.strokeStyle = "#000";
               ctx.strokeText(entity.name, x - width / 2, y);
               
               // Draw text
               ctx.fillStyle = "#fff";
               ctx.fillText(entity.name, x - width / 2, y);
            }
         }
      }
   }

   // requestAnimationFrame(renderPlayerNames);
}