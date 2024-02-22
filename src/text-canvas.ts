import { SettingsConst, randFloat } from "webgl-test-shared";
import Board from "./Board";
import Camera from "./Camera";
import { halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "./webgl";

// @Cleanup: The logic for damage, research and heal numbers is extremely similar, can probably be combined

interface ResearchNumber {
   positionX: number;
   positionY: number;
   readonly amount: number;
   age: number;
}

interface HealNumber {
   readonly healedEntityID: number;
   positionX: number;
   positionY: number;
   amount: number;
   age: number;
}

const DAMAGE_NUMBER_LIFETIME = 1.75;
const RESEARCH_NUMBER_LIFETIME = 1.5;
const HEAL_NUMBER_LIFETIME = 1.75;

const damageColours: ReadonlyArray<string> = ["#ddd", "#fbff2b", "#ffc130", "#ff6430"];
const damageColourThresholds: ReadonlyArray<number> = [0, 3, 5, 7];

const researchNumbers = new Array<ResearchNumber>();
const healNumbers = new Array<HealNumber>();

let ctx: CanvasRenderingContext2D;

let accumulatedDamage = 0;
/** Time that the accumulated damage has existed */
let damageTime = 0;
let damageNumberX = -1;
let damageNumberY = -1;

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

const clearTextCanvas = (): void => {
   // Clear the canvas
   ctx.fillStyle = "transparent";
   ctx.clearRect(0, 0, windowWidth, windowHeight);
}

export function createDamageNumber(originX: number, originY: number, damage: number): void {
   // Add a random offset to the damage number
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnOffsetMagnitude = randFloat(0, 30);
   damageNumberX = originX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   damageNumberY = originY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

   accumulatedDamage += damage;
   damageTime = DAMAGE_NUMBER_LIFETIME;
}

export function createResearchNumber(positionX: number, positionY: number, amount: number): void {
   researchNumbers.push({
      positionX: positionX,
      positionY: positionY,
      amount: amount,
      age: 0
   });
}

export function createHealNumber(healedEntityID: number, positionX: number, positionY: number, healAmount: number): void {
   // If there is an existing heal number for that entity, update it
   for (let i = 0; i < healNumbers.length; i++) {
      const healNumber = healNumbers[i];
      if (healNumber.healedEntityID === healedEntityID) {
         healNumber.amount += healAmount;;
         healNumber.positionX = positionX;
         healNumber.positionY = positionY;
         healNumber.age = 0;
         return;
      }
   }
   
   // Otherwise make a new one
   healNumbers.push({
      healedEntityID: healedEntityID,
      positionX: positionX,
      positionY: positionY,
      amount: healAmount,
      age: 0
   });
}

export function updateTextNumbers(): void {
   damageTime -= 1 / SettingsConst.TPS;
   if (damageTime < 0) {
      damageTime = 0;
      accumulatedDamage = 0;
   }

   // Update research numbers
   for (let i = 0; i < researchNumbers.length; i++) {
      const researchNumber = researchNumbers[i];

      researchNumber.age += 1 / SettingsConst.TPS;
      if (researchNumber.age >= RESEARCH_NUMBER_LIFETIME) {
         researchNumbers.splice(i, 1);
         i--;
         continue;
      }

      researchNumber.positionY += 8 / SettingsConst.TPS;
   }

   // Update heal numbers
   for (let i = 0; i < healNumbers.length; i++) {
      const healNumber = healNumbers[i];

      healNumber.age += 1 / SettingsConst.TPS;
      if (healNumber.age >= HEAL_NUMBER_LIFETIME) {
         healNumbers.splice(i, 1);
         i--;
         continue;
      }

      healNumber.positionY += 11 / SettingsConst.TPS;
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

const renderDamageNumbers = (): void => {
   ctx.lineWidth = 0;

   // Calculate position in camera
   const cameraX = getXPosInCamera(damageNumberX);
   const cameraY = getYPosInCamera(damageNumberY);

   ctx.font = "bold 35px sans-serif";
   ctx.lineJoin = "round";
   ctx.miterLimit = 2;

   const deathProgress = 1 - damageTime / DAMAGE_NUMBER_LIFETIME;
   ctx.globalAlpha = 1 - Math.pow(deathProgress, 3);

   const damageString = "-" + accumulatedDamage.toString();
   const width = ctx.measureText(damageString).width;

   // Draw text outline
   const SHADOW_OFFSET = 3;
   ctx.fillStyle = "#000";
   ctx.fillText(damageString, cameraX - width / 2 + SHADOW_OFFSET, cameraY + SHADOW_OFFSET);
   
   // Draw text
   ctx.fillStyle = getDamageNumberColour(accumulatedDamage);
   ctx.fillText(damageString, cameraX - width / 2, cameraY);

   ctx.globalAlpha = 1;
}

const renderResearchNumbers = (): void => {
   for (const researchNumber of researchNumbers) {
      ctx.lineWidth = 0;
   
      // Calculate position in camera
      const cameraX = getXPosInCamera(researchNumber.positionX);
      const cameraY = getYPosInCamera(researchNumber.positionY);
   
      ctx.font = "bold 35px sans-serif";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
   
      const deathProgress = researchNumber.age / RESEARCH_NUMBER_LIFETIME;
      ctx.globalAlpha = 1 - Math.pow(deathProgress, 3);
   
      const textString = "+" + researchNumber.amount.toString();
      const width = ctx.measureText(textString).width; // @Speed
   
      // Draw text outline
      const SHADOW_OFFSET = 3;
      ctx.fillStyle = "#000";
      ctx.fillText(textString, cameraX - width / 2 + SHADOW_OFFSET, cameraY + SHADOW_OFFSET);
      
      // Draw text
      ctx.fillStyle = "#b730ff";
      ctx.fillText(textString, cameraX - width / 2, cameraY);
   
      ctx.globalAlpha = 1;
   }
}

const renderHealNumbers = (): void => {
   for (const healNumber of healNumbers) {
      ctx.lineWidth = 0;
   
      // Calculate position in camera
      const cameraX = getXPosInCamera(healNumber.positionX);
      const cameraY = getYPosInCamera(healNumber.positionY);
   
      ctx.font = "bold 35px sans-serif";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
   
      const deathProgress = healNumber.age / HEAL_NUMBER_LIFETIME;
      ctx.globalAlpha = 1 - Math.pow(deathProgress, 3);
   
      const textString = "+" + healNumber.amount.toString();
      const width = ctx.measureText(textString).width; // @Speed
   
      // Draw text outline
      const SHADOW_OFFSET = 3;
      ctx.fillStyle = "#000";
      ctx.fillText(textString, cameraX - width / 2 + SHADOW_OFFSET, cameraY + SHADOW_OFFSET);
      
      // Draw text
      ctx.fillStyle = "#14f200";
      ctx.fillText(textString, cameraX - width / 2, cameraY);
   
      ctx.globalAlpha = 1;
   }
}

const renderPlayerNames = (): void => {
   for (const player of Board.players) {
      // Calculate position in camera
      const cameraX = getXPosInCamera(player.renderPosition.x);
      const cameraY = getYPosInCamera(player.renderPosition.y + 21);

      ctx.fillStyle = "#000";
      ctx.font = "400 20px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const width = ctx.measureText(player.username).width; // @Speed

      // Draw text outline
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#000";
      ctx.strokeText(player.username, cameraX - width / 2, cameraY);
      
      // Draw text
      ctx.fillStyle = "#fff";
      ctx.fillText(player.username, cameraX - width / 2, cameraY);
   }
}

export function renderText(): void {
   clearTextCanvas();
   renderPlayerNames();
   renderDamageNumbers();
   renderResearchNumbers();
   renderHealNumbers();
}