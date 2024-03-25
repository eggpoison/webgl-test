import { ServerComponentType, EntityType, ITEM_TYPE_RECORD, Point, Settings, circleAndRectangleDoIntersect, circlesDoIntersect, getTechByID } from "webgl-test-shared";
import Player, { getPlayerSelectedItem } from "./entities/Player";
import Game from "./Game";
import Board from "./Board";
import Hitbox from "./hitboxes/Hitbox";
import CircularHitbox from "./hitboxes/CircularHitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import Entity from "./Entity";
import Client from "./client/Client";
import { latencyGameState, playerIsHoldingHammer } from "./game-state/game-states";
import { isHoveringInBlueprintMenu } from "./components/game/BlueprintMenu";
import { InventoryMenuType, InventorySelector_inventoryIsOpen, InventorySelector_setInventoryMenuType } from "./components/game/inventories/InventorySelector";
import { getClosestGroupNum } from "./rendering/entity-selection-rendering";

const HIGHLIGHT_RANGE = 75;
const HIGHLIGHT_DISTANCE = 150;

let hoveredEntityID = -1;
let highlightedEntityID = -1;
let selectedEntityID = -1;

const hitboxIsWithinRange = (position: Point, hitbox: Hitbox, visionRange: number): boolean => {
   if (hitbox.hasOwnProperty("radius")) {
      // Circular hitbox
      return circlesDoIntersect(position.x, position.y, visionRange, hitbox.position.x, hitbox.position.y, (hitbox as CircularHitbox).radius);
   } else {
      // Rectangular hitbox
      return circleAndRectangleDoIntersect(position.x, position.y, visionRange, hitbox.position.x, hitbox.position.y, (hitbox as RectangularHitbox).width, (hitbox as RectangularHitbox).height, (hitbox as RectangularHitbox).rotation + (hitbox as RectangularHitbox).externalRotation);
   }
}

export function getHoveredEntityID(): number {
   return hoveredEntityID;
}

export function getHighlightedEntityID(): number {
   return highlightedEntityID;
}

export function getSelectedEntityID(): number {
   return selectedEntityID;
}

export function resetInteractableEntityIDs(): void {
   hoveredEntityID = -1;
   highlightedEntityID = -1;
   selectedEntityID = -1;
}

export function getSelectedEntity(): Entity {
   if (!Board.entityRecord.hasOwnProperty(selectedEntityID)) {
      throw new Error("Can't select: Entity with ID " + selectedEntityID + " doesn't exist");
   }

   return Board.entityRecord[selectedEntityID];
}

export function deselectSelectedEntity(closeInventory: boolean = true): void {
   if (Board.entityRecord.hasOwnProperty(selectedEntityID)) {
      const previouslySelectedEntity = Board.entityRecord[selectedEntityID];
      Client.sendStructureUninteract(previouslySelectedEntity.id);
   }

   selectedEntityID = -1;

   if (closeInventory) {
      InventorySelector_setInventoryMenuType(InventoryMenuType.none);
   }
}

export function deselectHighlightedEntity(): void {
   if (selectedEntityID === highlightedEntityID) {
      deselectSelectedEntity();
   }

   highlightedEntityID = -1;
}

const entityCanBeSelected = (entity: Entity): boolean => {
   // Tunnels can be selected if they have doors
   if (entity.type === EntityType.tunnel) {
      const tunnelComponent = entity.getServerComponent(ServerComponentType.tunnel);
      if (tunnelComponent.doorBitset !== 0) {
         return true;
      }
   }
   
   if (entity.type === EntityType.wall || entity.type === EntityType.tunnel || entity.type === EntityType.embrasure || entity.type === EntityType.spikes) {
      // Buildings can be selected if the player is holding a hammer
      const selectedItem = getPlayerSelectedItem();
      return selectedItem !== null && ITEM_TYPE_RECORD[selectedItem.type] === "hammer";
   }

   // Research benches can be selected if there is study able to be done
   if (entity.type === EntityType.researchBench) {
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

   if (entity.type === EntityType.tribeWorker || entity.type === EntityType.tribeWarrior) {
      // @Temporary: when able to recruit them, should be able to be selected if they are neutral with you
      const tribeComponent = entity.getServerComponent(ServerComponentType.tribe);
      return tribeComponent.tribeID === Game.tribe.id;
   }

   return entity.type === EntityType.door
      || entity.type === EntityType.barrel
      || entity.type === EntityType.furnace
      || entity.type === EntityType.campfire
      || entity.type === EntityType.ballista
      || entity.type === EntityType.slingTurret;
}

// @Cleanup: name
const getEntityID = (doPlayerProximityCheck: boolean, doCanSelectCheck: boolean): number => {
   const minChunkX = Math.max(Math.floor((Game.cursorPositionX! - HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((Game.cursorPositionX! + HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((Game.cursorPositionY! - HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((Game.cursorPositionY! + HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const origin = new Point(Game.cursorPositionX!, Game.cursorPositionY!);

   let minDist = HIGHLIGHT_RANGE + 1.1;
   let entityID = -1;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (doCanSelectCheck && !entityCanBeSelected(entity)) {
               continue;
            }

            if (doPlayerProximityCheck) {
               // @Incomplete: Should do it based on the distance from the closest hitbox rather than distance from center
               if (Player.instance!.position.calculateDistanceBetween(entity.position) > HIGHLIGHT_DISTANCE) {
                  continue;
               }
            }
            
            // Distance from cursor
            for (const hitbox of entity.hitboxes) {
               if (hitboxIsWithinRange(origin, hitbox, HIGHLIGHT_RANGE)) {
                  const distance = origin.calculateDistanceBetween(entity.position);
                  if (distance < minDist) {
                     minDist = distance;
                     entityID = entity.id;
                  }
                  break;
               }
            }
         }
      }
   }

   return entityID;
}

export function updateHighlightedAndHoveredEntities(): void {
   if (Player.instance === null || Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return;
   }

   // @Cleanup: This is a pretty messy function: has 3 different scenarios, only separated by guards. Maybe refactor?

   if (latencyGameState.playerIsPlacingEntity) {
      // When the player is placing an entity, we don't want them to be able to select entities.
      deselectHighlightedEntity();
      hoveredEntityID = getEntityID(false, false);
      return;
   }

   // If the player is interacting with an inventory, only consider the distance from the player not the cursor
   if (selectedEntityID !== -1 && Board.entityRecord.hasOwnProperty(selectedEntityID) && (isHoveringInBlueprintMenu() || InventorySelector_inventoryIsOpen())) {
      const selectedEntity = getSelectedEntity();
      const distance = Player.instance.position.calculateDistanceBetween(selectedEntity.position);
      if (distance <= HIGHLIGHT_DISTANCE) {
         hoveredEntityID = getEntityID(false, false);
         return;
      }
   }

   hoveredEntityID = getEntityID(false, false);

   const newHighlightedEntityID = getEntityID(true, true);
   if (newHighlightedEntityID !== highlightedEntityID) {
      deselectHighlightedEntity();
      highlightedEntityID = newHighlightedEntityID;
   }
}

export function attemptStructureSelect(): void {
   if (selectedEntityID !== -1) {
      deselectSelectedEntity();
   }

   let shouldSetSelectedEntity = true;

   if (Board.entityRecord.hasOwnProperty(highlightedEntityID)) {
      const highlightedEntity = Board.entityRecord[highlightedEntityID];

      switch (highlightedEntity.type) {
         case EntityType.tunnel: {
            const groupNum = getClosestGroupNum(highlightedEntity);
            if (groupNum === 0) {
               break;
            }
            
            let interactData: number;
            switch (groupNum) {
               case 1: interactData = 0b01; break;
               case 2: interactData = 0b10; break;
               default: throw new Error();
            }

            Client.sendStructureInteract(highlightedEntityID, interactData);
            shouldSetSelectedEntity = false;
            break;
         }
         case EntityType.door: {
            // Try to toggle doors if not holding a hammer
            if (!playerIsHoldingHammer()) {
               Client.sendStructureInteract(highlightedEntityID, 0);
               shouldSetSelectedEntity = false;
            }
            break;
         }
         case EntityType.researchBench: {
            Client.sendStructureInteract(highlightedEntityID, 0);
            break;
         }
         case EntityType.barrel: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.barrel);
            break;
         }
         case EntityType.tribeWorker:
         case EntityType.tribeWarrior: {
            const entityTribeComponent = highlightedEntity.getServerComponent(ServerComponentType.tribe);
            const playerTribeComponent = Player.instance!.getServerComponent(ServerComponentType.tribe);
            // Only interact with tribesman inventories if the player is of the same tribe
            if (entityTribeComponent.tribeID === playerTribeComponent.tribeID) {
               InventorySelector_setInventoryMenuType(InventoryMenuType.tribesman);
            } else {
               InventorySelector_setInventoryMenuType(InventoryMenuType.none);
            }
            break;
         }
         case EntityType.campfire: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.campfire);
            break;
         }
         case EntityType.furnace: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.furnace);
            break;
         }
         case EntityType.tombstone: {
            const tombstoneComponent = highlightedEntity.getServerComponent(ServerComponentType.tombstone);
            if (tombstoneComponent.deathInfo !== null) {
               InventorySelector_setInventoryMenuType(InventoryMenuType.tombstone);
            } else {
               InventorySelector_setInventoryMenuType(InventoryMenuType.none);
            }
            break;
         }
         case EntityType.ballista: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.ammoBox);
            break;
         }
         default: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.none);
            break;
         }
      }
   }

   if (shouldSetSelectedEntity) {
      selectedEntityID = highlightedEntityID;
   }
}

export function updateSelectedStructure(): void {
   if (highlightedEntityID === -1) {
      deselectSelectedEntity();
   }
}