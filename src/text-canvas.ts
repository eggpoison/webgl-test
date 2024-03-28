import { BuildingVulnerabilityData, EntityType, PotentialBuildingPlanData, ServerComponentType, Settings, distance, lerp, randFloat } from "webgl-test-shared";
import Board from "./Board";
import Camera from "./Camera";
import { halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "./webgl";
import OPTIONS from "./options";
import { getPotentialBuildingPlanIdealness, getPotentialBuildingPlans } from "./client/Client";
import Game from "./Game";

// @Cleanup: The logic for damage, research and heal numbers is extremely similar, can probably be combined

interface TextNumber {
   textWidth: number;
   positionX: number;
   positionY: number;
   age: number;
}

interface ResearchNumber extends TextNumber {
   positionX: number;
   positionY: number;
   readonly amount: number;
   age: number;
}

interface HealNumber extends TextNumber {
   readonly healedEntityID: number;
   amount: number;
}

const DAMAGE_NUMBER_LIFETIME = 1.75;
const RESEARCH_NUMBER_LIFETIME = 1.5;
const HEAL_NUMBER_LIFETIME = 1.75;

const damageColours: ReadonlyArray<string> = ["#ddd", "#fbff2b", "#ffc130", "#ff6430"];
const damageColourThresholds: ReadonlyArray<number> = [0, 3, 5, 7];

const researchNumbers = new Array<ResearchNumber>();
const healNumbers = new Array<HealNumber>();

let ctx: CanvasRenderingContext2D;

let damageNumberWidth = 0;
let accumulatedDamage = 0;
/** Time that the accumulated damage has existed */
let damageTime = 0;
let damageNumberX = -1;
let damageNumberY = -1;

let buildingVulnerabilities: ReadonlyArray<BuildingVulnerabilityData>;

export function setVisibleBuildingVulnerabilities(newBuildingVulnerabilities: ReadonlyArray<BuildingVulnerabilityData>): void {
   // @Speed: Garbage collection
   buildingVulnerabilities = newBuildingVulnerabilities;
}

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
      age: 0,
      // @Cleanup: Measure the text width here
      textWidth: 0
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
         healNumber.textWidth = ctx.measureText("+" + healNumber.amount.toString()).width;
         return;
      }
   }
   
   // Otherwise make a new one
   healNumbers.push({
      healedEntityID: healedEntityID,
      positionX: positionX,
      positionY: positionY,
      amount: healAmount,
      age: 0,
      textWidth: 0
   });
}

export function updateTextNumbers(): void {
   damageTime -= 1 / Settings.TPS;
   if (damageTime < 0) {
      damageTime = 0;
      accumulatedDamage = 0;
      damageNumberWidth = 0
   }

   // Update research numbers
   for (let i = 0; i < researchNumbers.length; i++) {
      const researchNumber = researchNumbers[i];

      researchNumber.age += 1 / Settings.TPS;
      if (researchNumber.age >= RESEARCH_NUMBER_LIFETIME) {
         researchNumbers.splice(i, 1);
         i--;
         continue;
      }

      researchNumber.positionY += 8 / Settings.TPS;
   }

   // Update heal numbers
   for (let i = 0; i < healNumbers.length; i++) {
      const healNumber = healNumbers[i];

      healNumber.age += 1 / Settings.TPS;
      if (healNumber.age >= HEAL_NUMBER_LIFETIME) {
         healNumbers.splice(i, 1);
         i--;
         continue;
      }

      healNumber.positionY += 11 / Settings.TPS;
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
   if (damageNumberWidth === 0) {
      damageNumberWidth = ctx.measureText(damageString).width;
   }

   // Draw text outline
   const SHADOW_OFFSET = 3;
   ctx.fillStyle = "#000";
   ctx.fillText(damageString, cameraX - damageNumberWidth / 2 + SHADOW_OFFSET, cameraY + SHADOW_OFFSET);
   
   // Draw text
   ctx.fillStyle = getDamageNumberColour(accumulatedDamage);
   ctx.fillText(damageString, cameraX - damageNumberWidth / 2, cameraY);

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
      if (researchNumber.textWidth === 0) {
         researchNumber.textWidth = ctx.measureText(textString).width;
      }
   
      // Draw text outline
      const SHADOW_OFFSET = 3;
      ctx.fillStyle = "#000";
      ctx.fillText(textString, cameraX - researchNumber.textWidth / 2 + SHADOW_OFFSET, cameraY + SHADOW_OFFSET);
      
      // Draw text
      ctx.fillStyle = "#b730ff";
      ctx.fillText(textString, cameraX - researchNumber.textWidth / 2, cameraY);
   
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
      if (healNumber.textWidth === 0) {
         healNumber.textWidth = ctx.measureText(textString).width;
      }
   
      // Draw text outline
      const SHADOW_OFFSET = 3;
      ctx.fillStyle = "#000";
      ctx.fillText(textString, cameraX - healNumber.textWidth / 2 + SHADOW_OFFSET, cameraY + SHADOW_OFFSET);
      
      // Draw text
      ctx.fillStyle = "#14f200";
      ctx.fillText(textString, cameraX - healNumber.textWidth / 2, cameraY);
   
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

      const playerComponent = player.getServerComponent(ServerComponentType.player);
      const username = playerComponent.username;

      const width = ctx.measureText(username).width; // @Speed

      // Draw text outline
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#000";
      ctx.strokeText(username, cameraX - width / 2, cameraY);
      
      // Draw text
      ctx.fillStyle = "#fff";
      ctx.fillText(username, cameraX - width / 2, cameraY);
   }
}

const renderPotentialBuildingPlans = (): void => {
   const potentialBuildingPlans = getPotentialBuildingPlans();
   for (let i = 0; i < potentialBuildingPlans.length; i++) {
      const potentialPlan = potentialBuildingPlans[i];

      // Calculate position in camera
      const cameraX = getXPosInCamera(potentialPlan.x);
      const cameraY = getYPosInCamera(potentialPlan.y);
      const height = 15;

      const idealness = getPotentialBuildingPlanIdealness(potentialPlan);

      // @Incomplete
      // const textColour = potentialPlan.isBestMin ? "#fff" : "#ccc";
      const textColour = "#fff";

      ctx.font = "400 13px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const text = potentialPlan.safety.toFixed(2);
      const width = ctx.measureText(text).width; // @Speed

      // Draw text bg
      ctx.globalAlpha = lerp(0.3, 1, idealness);
      ctx.fillStyle = "#000";
      ctx.fillRect(cameraX - width/2, cameraY - height / 2, width, height);
      
      // Draw text
      ctx.globalAlpha = lerp(0.7, 1, idealness);
      ctx.fillStyle = textColour;
      ctx.fillText(text, cameraX - width / 2, cameraY + height / 2 - 3);
   }
   ctx.globalAlpha = 1;
}

const getHoveredPotentialPlan = (): PotentialBuildingPlanData | null => {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return null;
   }
   
   const potentialBuildingPlans = getPotentialBuildingPlans();

   let closestPlan: PotentialBuildingPlanData | undefined;
   let minDist = 64;
   for (let i = 0; i < potentialBuildingPlans.length; i++) {
      const plan = potentialBuildingPlans[i];

      const dist = distance(Game.cursorPositionX, Game.cursorPositionY, plan.x, plan.y);
      if (dist < minDist) {
         minDist = dist;
         closestPlan = plan;
      }
   }

   if (typeof closestPlan !== "undefined") {
      return closestPlan;
   }
   return null;
}

const renderHoveredPotentialPlanInfo = (): void => {
   const hoveredPlan = getHoveredPotentialPlan();
   if (hoveredPlan === null) {
      return;
   }

   let left = getXPosInCamera(hoveredPlan.x);
   const top = getYPosInCamera(hoveredPlan.y);
   const height = 50;
   
   const safetyInfo = hoveredPlan.safetyInfo;
   for (let i = 0; i < safetyInfo.buildingIDs.length; i++) {
      const buildingID = safetyInfo.buildingIDs[i];
      const buildingType = safetyInfo.buildingTypes[i];
      const minSafety = safetyInfo.buildingMinSafetys[i];
      const averageSafety = safetyInfo.buildingAverageSafetys[i];

      ctx.font = "400 13px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const text = EntityType[buildingType] + " #" + buildingID;
      const labelWidth = ctx.measureText(text).width; // @Speed

      const minText = "- min=" + minSafety.toFixed(2);
      const minWidth = ctx.measureText(minText).width; // @Speed

      const averageText = "- avg=" + averageSafety.toFixed(2);
      const averageWidth = ctx.measureText(averageText).width; // @Speed

      const width = Math.max(labelWidth, minWidth, averageWidth);

      ctx.fillStyle = "#000";
      ctx.fillRect(left, top, width, height);

      // Label text
      
      ctx.fillStyle = "#fff";
      ctx.fillText(text, left, top + 13);

      // Min text

      ctx.fillStyle = "#fff";
      ctx.fillText(minText, left, top + 13 * 2);

      // Average text

      ctx.fillStyle = "#fff";
      ctx.fillText(averageText, left, top + 13 * 3);

      left += width + 3;
   }
}

const renderBuildingVulnerabilities = (): void => {
   for (let i = 0; i < buildingVulnerabilities.length; i++) {
      const buildingVulnerabilityData = buildingVulnerabilities[i];

      // Calculate position in camera
      const cameraX = getXPosInCamera(buildingVulnerabilityData.x);
      const cameraY = getYPosInCamera(buildingVulnerabilityData.y);
      const height = 20;

      ctx.font = "400 20px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const text = buildingVulnerabilityData.safety.toFixed(2);
      const width = ctx.measureText(text).width; // @Speed

      // Draw text bg
      ctx.fillStyle = "#000";
      ctx.fillRect(cameraX - width/2, cameraY - height, width, height);
      
      // Draw text
      ctx.fillStyle = "#fff";
      ctx.fillText(text, cameraX - width / 2, cameraY - 3);
   }
}

export function renderText(): void {
   clearTextCanvas();
   renderPlayerNames();
   renderDamageNumbers();
   renderResearchNumbers();
   renderHealNumbers();
   if (OPTIONS.showBuildingVulnerabilities) {
      renderBuildingVulnerabilities();
   }
   if (OPTIONS.showPotentialBuildingPlans) {
      renderPotentialBuildingPlans();
      renderHoveredPotentialPlanInfo();
   }
}