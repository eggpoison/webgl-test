import { EntityType, ITEM_TYPE_RECORD, Point, SETTINGS, circleAndRectangleDoIntersect, circlesDoIntersect, getTechByID } from "webgl-test-shared";
import Player, { getPlayerSelectedItem } from "./entities/Player";
import Game from "./Game";
import Board from "./Board";
import Hitbox from "./hitboxes/Hitbox";
import CircularHitbox from "./hitboxes/CircularHitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import GameObject from "./GameObject";
import Client from "./client/Client";
import { latencyGameState } from "./game-state/game-states";
import { isHoveringInBlueprintMenu } from "./components/game/BlueprintMenu";

const HIGHLIGHT_RANGE = 75;
const HIGHLIGHT_DISTANCE = 150;

let highlightedStructureID = -1;
let selectedStructureID = -1;

const hitboxIsWithinRange = (position: Point, hitbox: Hitbox, visionRange: number): boolean => {
   if (hitbox.hasOwnProperty("radius")) {
      // Circular hitbox
      return circlesDoIntersect(position.x, position.y, visionRange, hitbox.position.x, hitbox.position.y, (hitbox as CircularHitbox).radius);
   } else {
      // Rectangular hitbox
      return circleAndRectangleDoIntersect(position.x, position.y, visionRange, hitbox.position.x, hitbox.position.y, (hitbox as RectangularHitbox).width, (hitbox as RectangularHitbox).height, (hitbox as RectangularHitbox).rotation + (hitbox as RectangularHitbox).externalRotation);
   }
}

export function getHighlightedStructureID(): number {
   return highlightedStructureID;
}

export function getSelectedStructureID(): number {
   return selectedStructureID;
}

const entityCanBeSelected = (entity: GameObject): boolean => {
   if (entity.type === EntityType.woodenWall) {
      // Walls can be selected if the player is holding a hammer
      const selectedItem = getPlayerSelectedItem();
      return selectedItem !== null && ITEM_TYPE_RECORD[selectedItem.type] === "hammer";
   }

   if (entity.type === EntityType.researchBench) {
      // Research benches can be selected if there is study able to be done

      if (Game.tribe.selectedTechID === null) {
         return false;
      }

      if (Game.tribe.techTreeUnlockProgress.hasOwnProperty(Game.tribe.selectedTechID)) {
         const techInfo = getTechByID(Game.tribe.selectedTechID);
         if (Game.tribe.techTreeUnlockProgress[Game.tribe.selectedTechID]!.studyProgress >= techInfo.researchStudyRequirements) {
            return false;
         }
      }

      return true;
   }

   return entity.type === EntityType.woodenDoor;
}

export function updateHighlightedStructure(): void {
   if (Player.instance === null || Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return;
   }

   if (latencyGameState.playerIsPlacingEntity) {
      highlightedStructureID = -1;
      return;
   }

   if (isHoveringInBlueprintMenu()) {
      return;
   }
   
   const minChunkX = Math.max(Math.floor((Game.cursorPositionX - HIGHLIGHT_RANGE) / SETTINGS.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((Game.cursorPositionX + HIGHLIGHT_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((Game.cursorPositionY - HIGHLIGHT_RANGE) / SETTINGS.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((Game.cursorPositionY + HIGHLIGHT_RANGE) / SETTINGS.CHUNK_UNITS), SETTINGS.BOARD_SIZE - 1);

   const origin = new Point(Game.cursorPositionX, Game.cursorPositionY);
   
   let minDist = HIGHLIGHT_RANGE + 1;
   highlightedStructureID = -1;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.getGameObjects()) {
            if (!entityCanBeSelected(entity)) {
               continue;
            }

            // @Incomplete: Should do it based on the distance from the closest hitbox rather than distance from center
            if (Player.instance.position.calculateDistanceBetween(entity.position) > HIGHLIGHT_DISTANCE) {
               continue;
            }
            
            for (const hitbox of entity.hitboxes) {
               if (hitboxIsWithinRange(origin, hitbox, HIGHLIGHT_RANGE)) {
                  const distance = origin.calculateDistanceBetween(entity.position);
                  if (distance < minDist) {
                     minDist = distance;
                     highlightedStructureID = entity.id;
                  }
                  break;
               }
            }
         }
      }
   }
}

export function attemptStructureSelect(): void {
   selectedStructureID = highlightedStructureID;

   if (Board.entityRecord.hasOwnProperty(selectedStructureID)) {
      const structure = Board.entityRecord[selectedStructureID];
      if (structure.type === EntityType.woodenDoor) {
         Client.sendStructureInteract(selectedStructureID);
      }
   }
}

export function updateSelectedStructure(): void {
   if (highlightedStructureID === -1) {
      selectedStructureID = -1;
   }
}