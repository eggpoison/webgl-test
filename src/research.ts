import { EntityType, RESEARCH_ORB_AMOUNTS, RESEARCH_ORB_COMPLETE_TIME, Settings, distance, getRandomResearchOrbSize, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared";
import Player from "./entities/Player";
import Board from "./Board";
import Game from "./Game";
import Client from "./client/Client";
import { getSelectedEntityID } from "./entity-selection";
import { playSound } from "./sound";
import { createMagicParticle, createStarParticle } from "./particles";
import ResearchBench from "./entities/ResearchBench";

export interface ResearchOrb {
   /* X position of the node in the world */
   readonly positionX: number;
   /* Y position of the node in the world */
   readonly positionY: number;
   readonly rotation: number;
   readonly size: number;
}

let currentBenchID = -1;
let currentResearchOrb: ResearchOrb | null = null;
let orbCompleteProgress = 0;

export const RESEARCH_ORB_SIZES = [20, 30, 40];
const ORB_NUM_PARTICLES = [2, 4, 7];
const ORB_COMPLETE_SOUND_PITCHES = [1, 0.85, 0.7];
const ORB_PARTICLES_PER_SECOND = [2, 3.5, 6];

const generateResearchOrb = (): ResearchOrb => {
   const researchBench = Board.entityRecord[currentBenchID];

   const xInBench = randFloat(-ResearchBench.WIDTH * 0.5, ResearchBench.WIDTH * 0.5) * 0.8;
   const yInBench = randFloat(-ResearchBench.HEIGHT * 0.5, ResearchBench.HEIGHT * 0.5) * 0.8;
   
   const x = researchBench.position.x + rotateXAroundOrigin(xInBench, yInBench, researchBench.rotation);
   const y = researchBench.position.y + rotateYAroundOrigin(xInBench, yInBench, researchBench.rotation);

   return {
      positionX: x,
      positionY: y,
      rotation: 2 * Math.PI * Math.random(),
      size: getRandomResearchOrbSize()
   };
}

export function getResearchOrb(): ResearchOrb | null {
   return currentResearchOrb;
}

export function getResearchOrbCompleteProgress(): number {
   return orbCompleteProgress / RESEARCH_ORB_COMPLETE_TIME;
}

export function updateActiveResearchBench(): void {
   const selectedStructureID = getSelectedEntityID();
   if (selectedStructureID === -1 || !Board.entityRecord.hasOwnProperty(selectedStructureID)) {
      currentResearchOrb = null;
      currentBenchID = -1;
      return;
   }

   const structure = Board.entityRecord[selectedStructureID];
   if (structure.type !== EntityType.researchBench) {
      return;
   }

   currentBenchID = selectedStructureID;
   if (currentResearchOrb === null) {
      currentResearchOrb = generateResearchOrb();
   }
}

export function updateResearchOrb(): void {
   if (currentResearchOrb === null) {
      return;
   }

   if (Math.random() < ORB_PARTICLES_PER_SECOND[currentResearchOrb.size] / Settings.TPS) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetMagnitude = RESEARCH_ORB_SIZES[currentResearchOrb.size] / 2 * 1.25 * Math.random();
      const x = currentResearchOrb.positionX + offsetMagnitude * Math.sin(offsetDirection);
      const y = currentResearchOrb.positionY + offsetMagnitude * Math.cos(offsetDirection);
      createMagicParticle(x, y);
   }
}

const completeOrb = (): void => {
   const studyAmount = RESEARCH_ORB_AMOUNTS[currentResearchOrb!.size];
   Client.sendStudyTech(studyAmount);

   for (let i = 0; i < ORB_NUM_PARTICLES[currentResearchOrb!.size]; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetMagnitude = RESEARCH_ORB_SIZES[currentResearchOrb!.size] / 2 * 1.5 * Math.random();
      const x = currentResearchOrb!.positionX + offsetMagnitude * Math.sin(offsetDirection);
      const y = currentResearchOrb!.positionY + offsetMagnitude * Math.cos(offsetDirection);
      createStarParticle(x, y);
   }

   playSound("orb-complete.mp3", 0.3, ORB_COMPLETE_SOUND_PITCHES[currentResearchOrb!.size], Player.instance!.position.x, Player.instance!.position.y);

   // Make the player smack to the bench
   Player.instance!.rightLastActionTicks = Board.ticks;
   
   currentResearchOrb = generateResearchOrb();
   orbCompleteProgress = 0;
}

export function attemptToResearch(): void {
   if (currentResearchOrb === null || Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return;
   }
   
   const nodeSize = RESEARCH_ORB_SIZES[currentResearchOrb.size];

   const distFromOrb = distance(Game.cursorPositionX, Game.cursorPositionY, currentResearchOrb.positionX, currentResearchOrb.positionY);
   if (distFromOrb < nodeSize / 2) {
      orbCompleteProgress += 1 / Settings.TPS;
      if (orbCompleteProgress > RESEARCH_ORB_COMPLETE_TIME) {
         orbCompleteProgress = RESEARCH_ORB_COMPLETE_TIME;
      }
   } else {
      orbCompleteProgress = 0;
   }
}

export function attemptToCompleteNode(): void {
   if (orbCompleteProgress >= RESEARCH_ORB_COMPLETE_TIME) {
      completeOrb();
   }
}