import { SETTINGS, randFloat } from "webgl-test-shared";
import Board from "./Board";
import Camera from "./Camera";
import { halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "./webgl";

const DAMAGE_NUMBER_LIFETIME = 1.5;

const damageColours: ReadonlyArray<string> = ["#ddd", "#fbff2b", "#ffc130", "#ff6430"];
const damageColourThresholds: ReadonlyArray<number> = [0, 3, 5, 7];

let ctx: CanvasRenderingContext2D;

interface DamageNumber {
   readonly x: number;
   readonly y: number;
   readonly damage: number;
   age: number;
}

const damageNumbers = new Array<DamageNumber>();

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

export function clearTextCanvas(): void {
   // Clear the canvas
   ctx.fillStyle = "transparent";
   ctx.clearRect(0, 0, windowWidth, windowHeight);
}

export function createDamageNumber(originX: number, originY: number, damage: number): void {
   // Add a random offset to the damage number
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnOffsetMagnitude = randFloat(0, 30);
   const x = originX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   const y = originY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
   
   damageNumbers.push({
      x: x,
      y: y,
      damage: damage,
      age: 0
   });
}

export function updateDamageNumbers(): void {
   for (let i = 0; i < damageNumbers.length; i++) {
      const damageNumber = damageNumbers[i];
      damageNumber.age += 1 / SETTINGS.TPS;
      if (damageNumber.age >= DAMAGE_NUMBER_LIFETIME) {
         damageNumbers.splice(i, 1);
         i--;
      }
   }
}

const getDamageNumberColour = (damage: number): string => {
   let colour = damageColours[0];
   for (let i = 1; i < damageColours.length; i++) {
      const threshold = damageColourThresholds[i];
      if (damage >= threshold) {
         colour = damageColours[i];
      } else {
         break;
      }
   }
   return colour;
}

export function renderDamageNumbers(): void {
   if(1+1===2)return;
   ctx.lineWidth = 0;

   for (const damageNumber of damageNumbers) {
      // Calculate position in camera
      const cameraX = getXPosInCamera(damageNumber.x);
      const cameraY = getYPosInCamera(damageNumber.y);

      ctx.font = "bold 35px sans-serif";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const deathProgress = damageNumber.age / DAMAGE_NUMBER_LIFETIME;
      ctx.globalAlpha = 1 - Math.pow(deathProgress, 3);

      const damageString = "-" + damageNumber.damage.toString();
      const width = ctx.measureText(damageString).width;

      // Draw text outline
      const SHADOW_OFFSET = 4;
      ctx.fillStyle = "#000";
      ctx.fillText(damageString, cameraX - width / 2 + SHADOW_OFFSET, cameraY + SHADOW_OFFSET);
      
      // Draw text
      ctx.fillStyle = getDamageNumberColour(damageNumber.damage);
      ctx.fillText(damageString, cameraX - width / 2, cameraY);
   }

   ctx.globalAlpha = 1;
}

export function renderPlayerNames(): void {
   for (const player of Board.players) {
      // Calculate position in camera
      const cameraX = getXPosInCamera(player.renderPosition.x);
      const cameraY = getYPosInCamera(player.renderPosition.y + 21);

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