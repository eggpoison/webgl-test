import { EntityType, Point, SETTINGS, pointIsInRectangle, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared";
import Player from "./entities/Player";
import Board from "./Board";
import Game from "./Game";
import Client from "./client/Client";
import { createResearchNumber } from "./text-canvas";
import { setResearchBenchCaption } from "./components/game/ResearchBenchCaption";

const RESEARCH_RANGE = 150;
const NODE_COMPLETE_TIME = 1.5;

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
   if (Player.instance === null) {
      return;
   }
   
   const minChunkX = Math.max(Math.floor((Player.instance.position.x - RESEARCH_RANGE) / SETTINGS.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((Player.instance.position.x + RESEARCH_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((Player.instance.position.y - RESEARCH_RANGE) / SETTINGS.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((Player.instance.position.y + RESEARCH_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1);

   let closestBenchID = -1;
   let minDist = RESEARCH_RANGE + Number.EPSILON;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getGameObjects()) {
            if (entity.type !== EntityType.researchBench) {
               continue;
            }

            const distance = Player.instance.position.calculateDistanceBetween(entity.position);
            if (distance < minDist) {
               minDist = distance;
               closestBenchID = entity.id;
            }
         }
      }
   }

   if (closestBenchID !== -1) {
      // If near a bench but no tech is selected, show a caption saying that none is selected
      if (Game.tribe.selectedTechID === null) {
         setResearchBenchCaption("No tech is selected");
         return;
      }

      currentBenchID = closestBenchID;
      if (currentResearchNode === null) {
         currentResearchNode = generateResearchNode();
      }
      setResearchBenchCaption("");
   } else {
      setResearchBenchCaption("");
      currentResearchNode = null;
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