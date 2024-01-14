import { EntityType, Point, SETTINGS, pointIsInRectangle, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared";
import Player from "./entities/Player";
import Board from "./Board";
import Game from "./Game";
import Client from "./client/Client";
import { createResearchNumber } from "./text-canvas";
import { getSelectedStructureID } from "./structure-selection";

const NODE_COMPLETE_TIME = 1.25;

enum ResearchNodeSize {
   small,
   medium,
   large
}

export interface ResearchNode {
   /* X position of the node in the world */
   readonly positionX: number;
   /* Y position of the node in the world */
   readonly positionY: number;
   readonly rotation: number;
   readonly size: number;
}

let currentBenchID = -1;
let currentResearchNode: ResearchNode | null = null;
let nodeCompleteProgress = 0;

export const RESEARCH_NODE_SIZES = [20, 30, 40];
const RESEARCH_NODE_AMOUNTS = [1, 3, 5];

const generateResearchNode = (): ResearchNode => {
   const researchBench = Board.entityRecord[currentBenchID];

   const xInBench = randFloat(-32 * 2, 32 * 2);
   const yInBench = randFloat(-20 * 2, 20 * 2);
   
   const x = researchBench.position.x + rotateXAroundOrigin(xInBench, yInBench, researchBench.rotation);
   const y = researchBench.position.y + rotateYAroundOrigin(xInBench, yInBench, researchBench.rotation);

   let size: ResearchNodeSize = 0;
   while (Math.random() < 0.5 && size < ResearchNodeSize.large) {
      size++;
   }
   
   return {
      positionX: x,
      positionY: y,
      rotation: 2 * Math.PI * Math.random(),
      size: size
   };
}

export function getResearchNode(): ResearchNode | null {
   return currentResearchNode;
}

export function updateActiveResearchBench(): void {
   const selectedStructureID = getSelectedStructureID();
   if (selectedStructureID === -1 || !Board.entityRecord.hasOwnProperty(selectedStructureID)) {
      currentResearchNode = null;
      currentBenchID = -1;
      return;
   }

   const structure = Board.entityRecord[selectedStructureID];
   if (structure.type !== EntityType.researchBench) {
      return;
   }

   currentBenchID = selectedStructureID;
   if (currentResearchNode === null) {
      currentResearchNode = generateResearchNode();
   }
}

const completeNode = (): void => {
   const studyAmount = RESEARCH_NODE_AMOUNTS[currentResearchNode!.size];
   createResearchNumber(Player.instance!.position.x, Player.instance!.position.y, studyAmount);
   Client.sendStudyTech(studyAmount);
   
   currentResearchNode = generateResearchNode();
   nodeCompleteProgress = 0;
}

export function attemptToResearch(): void {
   if (currentResearchNode === null || Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return;
   }
   
   const nodeSize = RESEARCH_NODE_SIZES[currentResearchNode.size];
   const rectPos = new Point(currentResearchNode.positionX, currentResearchNode.positionY);
   if (pointIsInRectangle(Game.cursorPositionX, Game.cursorPositionY, rectPos, new Point(0, 0), nodeSize, nodeSize, currentResearchNode.rotation)) {
      nodeCompleteProgress += 1 / SETTINGS.TPS;
      if (nodeCompleteProgress >= NODE_COMPLETE_TIME) {
         completeNode();
      }
   } else {
      nodeCompleteProgress = 0;
   }
}