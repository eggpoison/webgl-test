import { useCallback, useEffect, useRef, useState } from "react";
import { deselectSelectedEntity, getSelectedEntityID } from "../../entity-selection";
import Board from "../../Board";
import Camera from "../../Camera";
import Client from "../../client/Client";
import { BlueprintType, BuildingMaterial, EntityType, ItemType, ServerComponentType } from "webgl-test-shared";
import { GhostType } from "../../rendering/entity-ghost-rendering";
import { getItemTypeImage } from "../../client-item-info";
import Entity from "../../Entity";
import { definiteGameState, playerIsHoldingHammer } from "../../game-state/game-states";
import { countItemTypesInInventory } from "../../inventory-manipulation";
import { playSound } from "../../sound";
import Player from "../../entities/Player";
import { entityIsPlacedOnWall } from "../../entities/Spikes";

let showBlueprintMenu: (x: number, y: number, building: Entity) => void;
export let hideBlueprintMenu: () => void = () => {};

let hoveredGhostType: GhostType | null = null;
export function getHoveredGhostType(): GhostType | null {
   return hoveredGhostType;
}

let isHovering = false;
export function isHoveringInBlueprintMenu(): boolean {
   return isHovering;
}

export let blueprintMenuIsOpen: () => boolean = () => false;

enum OptionType {
   placeBlueprint,
   modify,
   deconstruct
}

interface OptionCost {
   readonly itemType: ItemType;
   readonly amount: number;
}

interface MenuOption {
   readonly name: string;
   readonly imageSource: string | ((entity: Entity) => string);
   readonly imageWidth: number | ((entity: Entity) => number);
   readonly imageHeight: number | ((entity: Entity) => number);
   /** The type of the ghost which gets shown when previewing this option */
   readonly ghostType: GhostType | ((entity: Entity) => GhostType);
   readonly optionType: OptionType;
   readonly cost?: OptionCost;
   readonly requirement?: (entity: Entity) => boolean;
   readonly blueprintType: BlueprintType | ((entity: Entity) => BlueprintType) | null;
   readonly isClickable?: (entity: Entity) => boolean;
}

const EMBRASURE_IMAGE_SOURCES = [require("../../images/entities/embrasure/wooden-embrasure.png"), require("../../images/entities/embrasure/stone-embrasure.png")];
const DOOR_IMAGE_SOURCES = [require("../../images/entities/door/wooden-door.png"), require("../../images/entities/door/stone-door.png")];
const TUNNEL_IMAGE_SOURCES = [require("../../images/entities/tunnel/wooden-tunnel.png"), require("../../images/entities/tunnel/stone-tunnel.png")];

const FLOOR_SPIKE_IMAGE_SOURCE = require("../../images/entities/spikes/stone-floor-spikes.png");
const WALL_SPIKE_IMAGE_SOURCE = require("../../images/entities/spikes/stone-wall-spikes.png");

const EMBRASURE_GHOST_TYPES = [GhostType.woodenEmbrasure, GhostType.stoneEmbrasure];
const DOOR_GHOST_TYPES = [GhostType.woodenDoor, GhostType.stoneDoor];
const TUNNEL_GHOST_TYPES = [GhostType.woodenTunnel, GhostType.stoneTunnel];

const EMBRASURE_BLUEPRINT_TYPES = [BlueprintType.woodenEmbrasure, BlueprintType.stoneEmbrasure];
const DOOR_BLUEPRINT_TYPES = [BlueprintType.woodenDoor, BlueprintType.stoneDoor];
const TUNNEL_BLUEPRINT_TYPES = [BlueprintType.woodenTunnel, BlueprintType.stoneTunnel];

const ENTITY_MENU_RECORD: Partial<Record<EntityType, ReadonlyArray<MenuOption>>> = {
   [EntityType.wall]: [
      {
         name: "UPGRADE",
         imageSource: require("../../images/entities/wall/stone-wall.png"),
         imageWidth: 64,
         imageHeight: 64,
         ghostType: GhostType.stoneWall,
         optionType: OptionType.placeBlueprint,
         blueprintType: BlueprintType.stoneWall,
         cost: {
            itemType: ItemType.rock,
            amount: 5
         },
         requirement: (wall: Entity): boolean => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return wallComponent.material < BuildingMaterial.stone;
         }
      },
      {
         name: "DOOR",
         imageSource: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return DOOR_IMAGE_SOURCES[wallComponent.material];
         },
         imageWidth: 64,
         imageHeight: 24,
         ghostType: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return DOOR_GHOST_TYPES[wallComponent.material];
         },
         optionType: OptionType.placeBlueprint,
         blueprintType: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return DOOR_BLUEPRINT_TYPES[wallComponent.material];
         }
      },
      {
         name: "EMBRASURE",
         imageSource: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return EMBRASURE_IMAGE_SOURCES[wallComponent.material];
         },
         imageWidth: 64,
         imageHeight: 20,
         ghostType: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return EMBRASURE_GHOST_TYPES[wallComponent.material];
         },
         optionType: OptionType.placeBlueprint,
         blueprintType: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return EMBRASURE_BLUEPRINT_TYPES[wallComponent.material];
         }
      },
      {
         name: "TUNNEL",
         imageSource: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return TUNNEL_IMAGE_SOURCES[wallComponent.material];
         },
         imageWidth: 64,
         imageHeight: 64,
         ghostType: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return TUNNEL_GHOST_TYPES[wallComponent.material];
         },
         optionType: OptionType.placeBlueprint,
         blueprintType: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return TUNNEL_BLUEPRINT_TYPES[wallComponent.material];
         }
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 60,
         imageHeight: 60,
         ghostType: GhostType.deconstructMarker,
         optionType: OptionType.deconstruct,
         blueprintType: null
      }
   ],
   [EntityType.tunnel]: [
      {
         name: "UPGRADE",
         imageSource: require("../../images/entities/tunnel/stone-tunnel.png"),
         imageWidth: 64,
         imageHeight: 64,
         ghostType: GhostType.stoneTunnelUpgrade,
         optionType: OptionType.placeBlueprint,
         cost: {
            itemType: ItemType.rock,
            amount: 5
         },
         requirement: (tunnel: Entity): boolean => {
            const wallComponent = tunnel.getServerComponent(ServerComponentType.buildingMaterial);
            return wallComponent.material < BuildingMaterial.stone;
         },
         blueprintType: BlueprintType.stoneTunnelUpgrade
      },
      {
         name: "DOOR",
         imageSource: require("../../images/entities/tunnel/tunnel-door.png"),
         imageWidth: 48,
         imageHeight: 24,
         ghostType: GhostType.tunnelDoor,
         optionType: OptionType.modify,
         blueprintType: null,
         // @Incomplete: implement cost
         cost: {
            itemType: ItemType.wood,
            amount: 2
         },
         isClickable: (tunnel: Entity): boolean => {
            const tunnelComponent = tunnel.getServerComponent(ServerComponentType.tunnel);
            return tunnelComponent.doorBitset < 0b11;
         }
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 60,
         imageHeight: 60,
         ghostType: GhostType.deconstructMarker,
         optionType: OptionType.deconstruct,
         blueprintType: null
      }
   ],
   [EntityType.door]: [
      {
         name: "UPGRADE",
         imageSource: require("../../images/entities/door/stone-door.png"),
         imageWidth: 64,
         imageHeight: 24,
         ghostType: GhostType.stoneDoorUpgrade,
         optionType: OptionType.placeBlueprint,
         cost: {
            itemType: ItemType.rock,
            amount: 5
         },
         requirement: (door: Entity): boolean => {
            const wallComponent = door.getServerComponent(ServerComponentType.buildingMaterial);
            return wallComponent.material < BuildingMaterial.stone;
         },
         blueprintType: BlueprintType.stoneDoorUpgrade
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 60,
         imageHeight: 60,
         ghostType: GhostType.deconstructMarker,
         optionType: OptionType.deconstruct,
         blueprintType: null
      }
   ],
   [EntityType.embrasure]: [
      {
         name: "UPGRADE",
         imageSource: require("../../images/entities/embrasure/stone-embrasure.png"),
         imageWidth: 64,
         imageHeight: 20,
         ghostType: GhostType.stoneEmbrasureUpgrade,
         optionType: OptionType.placeBlueprint,
         cost: {
            itemType: ItemType.rock,
            amount: 5
         },
         requirement: (door: Entity): boolean => {
            const wallComponent = door.getServerComponent(ServerComponentType.buildingMaterial);
            return wallComponent.material < BuildingMaterial.stone;
         },
         blueprintType: BlueprintType.stoneEmbrasureUpgrade
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 60,
         imageHeight: 60,
         ghostType: GhostType.deconstructMarker,
         optionType: OptionType.deconstruct,
         blueprintType: null
      }
   ],
   [EntityType.spikes]: [
      {
         name: "UPGRADE",
         imageSource: (entity: Entity): string => {
            if (entityIsPlacedOnWall(entity)) {
               return WALL_SPIKE_IMAGE_SOURCE;
            } else {
               return FLOOR_SPIKE_IMAGE_SOURCE;
            }
         },
         imageWidth: (entity: Entity): number => {
            return entityIsPlacedOnWall(entity) ? 68 : 56;
         },
         imageHeight: (entity: Entity): number => {
            return entityIsPlacedOnWall(entity) ? 28 : 56;
         },
         ghostType: (entity: Entity): number => {
            return entityIsPlacedOnWall(entity) ? GhostType.stoneWallSpikes : GhostType.stoneFloorSpikes;
         },
         optionType: OptionType.placeBlueprint,
         cost: {
            itemType: ItemType.rock,
            amount: 5
         },
         requirement: (entity: Entity): boolean => {
            const wallComponent = entity.getServerComponent(ServerComponentType.buildingMaterial);
            return wallComponent.material < BuildingMaterial.stone;
         },
         blueprintType: (entity: Entity): number => {
            return entityIsPlacedOnWall(entity) ? BlueprintType.stoneWallSpikes : BlueprintType.stoneFloorSpikes;
         }
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 60,
         imageHeight: 60,
         ghostType: GhostType.deconstructMarker,
         optionType: OptionType.deconstruct,
         blueprintType: null
      }
   ]
};

const BlueprintMenu = () => {
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [isVisible, setIsVisible] = useState(false);
   const [building, setBuilding] = useState<Entity | null>(null);
   const [hoveredOptionIdx, setHoveredOptionIdx] = useState<number | null>(null);
   const blueprintRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      showBlueprintMenu = (x: number, y: number, building: Entity): void => {
         setIsVisible(true);
         setX(x);
         setY(y);
         setBuilding(building);
      }

      hideBlueprintMenu = (): void => {
         hoveredGhostType = null;
         isHovering = false;
         setIsVisible(false);
      }
   }, []);

   useEffect(() => {
      blueprintMenuIsOpen = () => isVisible;
   }, [isVisible]);
   
   const setHoveredGhostType = (ghostType: GhostType): void => {
      hoveredGhostType = ghostType;
   }

   const clearHoveredGhostType = (): void => {
      hoveredGhostType = null;
   }

   const click = useCallback((): void => {
      if (hoveredOptionIdx === null || building === null) {
         return;
      }

      const selectOption = (option: MenuOption): void => {
         if (typeof option.cost !== "undefined") {
            let count = countItemTypesInInventory(definiteGameState.hotbar, option.cost.itemType);
            if (definiteGameState.backpack !== null) {
               count += countItemTypesInInventory(definiteGameState.backpack, option.cost.itemType);
            }
   
            if (count < option.cost.amount) {
               playSound("error.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
               return;
            }
         }
   
         const selectedStructureID = getSelectedEntityID();
         switch (option.optionType) {
            case OptionType.placeBlueprint: {
               let blueprintType: BlueprintType;
               if (option.blueprintType === null) {
                  throw new Error();
               } else if (typeof option.blueprintType === "number") {
                  blueprintType = option.blueprintType;
               } else {
                  blueprintType = option.blueprintType(building!);
               }
               
               Client.sendPlaceBlueprint(selectedStructureID, blueprintType);
               break;
            }
            case OptionType.modify: {
               Client.sendModifyBuilding(selectedStructureID);
               break;
            }
            case OptionType.deconstruct: {
               Client.sendDeconstructBuilding(selectedStructureID);
               break;
            }
         }
   
         deselectSelectedEntity();
      }

      const menuOptions = ENTITY_MENU_RECORD[building.type]!;
      const option = menuOptions[hoveredOptionIdx];
      const isClickable = typeof option.isClickable === "undefined" || option.isClickable(building);
      if (isClickable) {
         selectOption(option);
      }
   }, [hoveredOptionIdx, building]);

   if (!isVisible || building === null) {
      return null;
   }

   const menuOptions = ENTITY_MENU_RECORD[building.type]!;

   
   const separators = new Array<JSX.Element>();
   for (let i = 0; i < menuOptions.length; i++) {
      const direction = 2 * Math.PI * i / menuOptions.length + 2 * Math.PI / menuOptions.length * 0.5;

      separators.push(
         <div key={i} className="separator" style={{"--direction": direction.toString(), "--x-proj": Math.cos(direction + Math.PI/2).toString(), "--y-proj": Math.sin(direction + Math.PI/2).toString()} as React.CSSProperties}></div>
      );
   }

   const segments = new Array<JSX.Element>();
   const segmentCoverage = 2 * Math.PI / menuOptions.length * (180 / Math.PI);
   for (let i = 0; i < menuOptions.length; i++) {
      // @Incomplete
      const direction = 2 * Math.PI * i / menuOptions.length + 2 * Math.PI / menuOptions.length * 2.5;

      segments.push(
         <div key={i} className={`segment${i === hoveredOptionIdx ? " hovered" : ""}`} style={{"--direction": (direction).toString(), "--coverage": segmentCoverage.toString()} as React.CSSProperties}></div>
      );
   }

   const options = new Array<JSX.Element>();
   for (let i = 0; i < menuOptions.length; i++) {
      const option = menuOptions[i];
      if (typeof option.requirement !== "undefined" && !option.requirement(building)) {
         continue;
      }

      let imageSource: string;
      if (typeof option.imageSource === "string") {
         imageSource = option.imageSource;
      } else {
         imageSource = option.imageSource(building);
      }

      let imageWidth: number;
      if (typeof option.imageWidth === "number") {
         imageWidth = option.imageWidth;
      } else {
         imageWidth = option.imageWidth(building);
      }

      let imageHeight: number;
      if (typeof option.imageHeight === "number") {
         imageHeight = option.imageHeight;
      } else {
         imageHeight = option.imageHeight(building);
      }

      const direction = 2 * Math.PI * i / menuOptions.length;

      options.push(
         <div key={i} className="option" style={{"--direction": (direction + Math.PI/4).toString(), "--x-proj": Math.cos(direction + Math.PI/2).toString(), "--y-proj": Math.sin(direction + Math.PI/2).toString()} as React.CSSProperties}>
            <img src={imageSource} alt="" style={{"--width": imageWidth.toString(), "--height": imageHeight.toString()} as React.CSSProperties} />
            {typeof option.cost !== "undefined" ? (
               <div className="cost-container">
                  <img src={getItemTypeImage(option.cost.itemType)} alt="" />
                  <span>{option.cost.amount}</span>
               </div>
            ) : undefined}
         </div>
      );
   }

   const hotkeyLabels = new Array<JSX.Element>();
   for (let i = 0; i < menuOptions.length; i++) {
      const direction = 2 * Math.PI * i / menuOptions.length;

      hotkeyLabels.push(
         <div key={i} className="hotkey-label" style={{"--direction": (direction + Math.PI/4).toString(), "--x-proj": Math.cos(direction + Math.PI/2).toString(), "--y-proj": Math.sin(direction + Math.PI/2).toString()} as React.CSSProperties}>
            {i + 1}
         </div>
      );
   }

   const getOptionIdx = (e: MouseEvent): number | null => {
      const menuElement = blueprintRef.current;
      if (menuElement === null) {
         return null;
      }

      const rect = menuElement.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const diffX = e.clientX - centerX;
      const diffY = centerY - e.clientY;
      let angle = Math.atan2(diffY, diffX);
      angle -= 2 * Math.PI / menuOptions.length / 2;
      angle += Math.PI/2;
      if (angle < 0) {
         angle += Math.PI * 2;
      }

      const segmentIdx = menuOptions.length - 1 - Math.floor(angle / (2 * Math.PI) * menuOptions.length);
      return segmentIdx;
   }

   const mouseMove = (e: MouseEvent) => {
      const optionIdx = getOptionIdx(e);
      setHoveredOptionIdx(optionIdx);

      if (optionIdx !== null) {
         const option = menuOptions[optionIdx];
         
         let ghostType: GhostType;
         if (typeof option.ghostType === "number") {
            ghostType = option.ghostType;
         } else {
            ghostType = option.ghostType(building);
         }

         setHoveredGhostType(ghostType);
      }
   }

   return <div ref={blueprintRef} id="blueprint-menu" onMouseDown={() => click()} onMouseMove={e => mouseMove(e.nativeEvent)} onMouseEnter={() => {isHovering = true}} onMouseLeave={() => {isHovering = false; setHoveredOptionIdx(null); clearHoveredGhostType()}}  style={{"--x": x.toString(), "--y": y.toString()} as React.CSSProperties} onContextMenu={e => { e.preventDefault() }}>
      <div className="inner-ring"></div>
      {separators}
      {segments}
      {options}
      {hotkeyLabels}
   </div>;
}

export default BlueprintMenu;

export function updateBlueprintMenu(): void {
   // Deselect if switching to a non-hammer item
   if (!playerIsHoldingHammer()) {
      hideBlueprintMenu();
      return;
   }
   
   const selectedStructureID = getSelectedEntityID();
   if (selectedStructureID === -1 || !Board.entityRecord.hasOwnProperty(selectedStructureID)) {
      hideBlueprintMenu();
      return;
   }

const selectedStructure = Board.entityRecord[selectedStructureID];
   if (selectedStructure.type === EntityType.wall || selectedStructure.type === EntityType.tunnel || selectedStructure.type === EntityType.door || selectedStructure.type === EntityType.embrasure || selectedStructure.type === EntityType.spikes) {
      const screenX = Camera.calculateXScreenPos(selectedStructure.position.x);
      const screenY = Camera.calculateYScreenPos(selectedStructure.position.y);
      showBlueprintMenu(screenX, screenY, selectedStructure);
   } else {
      hideBlueprintMenu();
   }
}