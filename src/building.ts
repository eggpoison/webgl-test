import { EntityType, ITEM_TYPE_RECORD, Point, SETTINGS, circleAndRectangleDoIntersectWithOffset, circulesDoIntersectWithOffset } from "webgl-test-shared";
import { getPlayerSelectedItem } from "./entities/Player";
import Game from "./Game";
import Board from "./Board";
import Hitbox from "./hitboxes/Hitbox";
import CircularHitbox from "./hitboxes/CircularHitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";

const HIGHLIGHT_RANGE = 75;

let highlightedStructureID = -1;

const hitboxIsWithinRange = (position: Point, hitbox: Hitbox, visionRange: number): boolean => {
   // @Speed: This check is slow
   if (hitbox.hasOwnProperty("radius")) {
      // Circular hitbox
      // @Speed
      return circulesDoIntersectWithOffset(position, new Point(0, 0), visionRange, hitbox.position, hitbox.offset, (hitbox as CircularHitbox).radius);
   } else {
      // Rectangular hitbox
      // @Speed
      return circleAndRectangleDoIntersectWithOffset(position, new Point(0, 0), visionRange, hitbox.position, hitbox.offset, (hitbox as RectangularHitbox).width, (hitbox as RectangularHitbox).height, (hitbox as RectangularHitbox).rotation);
   }
}

export function getHighlightedStructureID(): number {
   return highlightedStructureID;
}

export function updateHighlightedStructure(): void {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return;
   }
   
   // Make sure the player is holding a hammer
   const selectedItem = getPlayerSelectedItem();
   if (selectedItem === null || ITEM_TYPE_RECORD[selectedItem.type] !== "hammer") {
      highlightedStructureID = -1;
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
            if (entity.type !== EntityType.woodenWall) {
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