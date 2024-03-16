import { useEffect, useState } from "react";
import { deselectSelectedEntity, getSelectedEntityID } from "../../entity-selection";
import Board from "../../Board";
import Camera from "../../Camera";
import Client from "../../client/Client";
import { BlueprintType, BuildingMaterial, EntityType, ItemType, ServerComponentType } from "webgl-test-shared";
import { GhostType } from "../../rendering/placeable-item-rendering";
import { getItemTypeImage } from "../../client-item-info";
import Entity from "../../Entity";
import { definiteGameState } from "../../game-state/game-states";
import { countItemTypesInInventory } from "../../inventory-manipulation";
import { playSound } from "../../sound";
import Player from "../../entities/Player";

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

export let blueprintMenuIsOpen: () => boolean;

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
   readonly imageWidth: number;
   readonly imageHeight: number;
   /** The type of the ghost which gets shown when previewing this option */
   readonly ghostType: GhostType | ((entity: Entity) => GhostType);
   readonly optionType: OptionType;
   readonly cost?: OptionCost;
   readonly requirement?: (entity: Entity) => boolean;
   readonly makeErrorSound?: () => boolean;
   readonly blueprintType: BlueprintType | ((entity: Entity) => BlueprintType) | null;
}

const EMBRASURE_IMAGE_SOURCES = [require("../../images/entities/embrasure/wooden-embrasure.png"), require("../../images/entities/embrasure/stone-embrasure.png")];
const DOOR_IMAGE_SOURCES = [require("../../images/entities/door/wooden-door.png"), require("../../images/entities/door/stone-door.png")];
const TUNNEL_IMAGE_SOURCES = [require("../../images/entities/tunnel/wooden-tunnel.png"), require("../../images/entities/tunnel/stone-tunnel.png")];

const EMBRASURE_GHOST_TYPES = [GhostType.woodenEmbrasure, GhostType.stoneEmbrasure];
const DOOR_GHOST_TYPES = [GhostType.woodenDoor, GhostType.stoneDoor];
const TUNNEL_GHOST_TYPES = [GhostType.woodenTunnel, GhostType.stoneTunnel];

const EMBRASURE_BLUEPRINT_TYPES = [BlueprintType.woodenEmbrasure, BlueprintType.stoneEmbrasure];
const DOOR_BLUEPRINT_TYPES = [BlueprintType.woodenDoor, BlueprintType.stoneDoor];
const TUNNEL_BLUEPRINT_TYPES = [BlueprintType.woodenTunnel, BlueprintType.stoneTunnel];

const shouldMakeErrorSound = (): boolean => {
   let count = countItemTypesInInventory(definiteGameState.hotbar, ItemType.rock);
   if (definiteGameState.backpack !== null) {
      count += countItemTypesInInventory(definiteGameState.backpack, ItemType.rock);
   }

   return count < 5;
}

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
         },
         makeErrorSound: (): boolean => {
            return shouldMakeErrorSound();
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
         imageWidth: 64,
         imageHeight: 64,
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
         ghostType: GhostType.stoneTunnel,
         optionType: OptionType.placeBlueprint,
         cost: {
            itemType: ItemType.rock,
            amount: 5
         },
         requirement: (tunnel: Entity): boolean => {
            const wallComponent = tunnel.getServerComponent(ServerComponentType.buildingMaterial);
            return wallComponent.material < BuildingMaterial.stone;
         },
         makeErrorSound: (): boolean => {
            return shouldMakeErrorSound();
         },
         blueprintType: BlueprintType.stoneTunnel
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
         }
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 64,
         imageHeight: 64,
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
         ghostType: GhostType.stoneDoor,
         optionType: OptionType.placeBlueprint,
         cost: {
            itemType: ItemType.rock,
            amount: 5
         },
         requirement: (door: Entity): boolean => {
            const wallComponent = door.getServerComponent(ServerComponentType.buildingMaterial);
            return wallComponent.material < BuildingMaterial.stone;
         },
         makeErrorSound: (): boolean => {
            return shouldMakeErrorSound();
         },
         blueprintType: BlueprintType.stoneDoor
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 64,
         imageHeight: 64,
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
         ghostType: GhostType.stoneEmbrasure,
         optionType: OptionType.placeBlueprint,
         cost: {
            itemType: ItemType.rock,
            amount: 5
         },
         requirement: (door: Entity): boolean => {
            const wallComponent = door.getServerComponent(ServerComponentType.buildingMaterial);
            return wallComponent.material < BuildingMaterial.stone;
         },
         makeErrorSound: (): boolean => {
            return shouldMakeErrorSound();
         },
         blueprintType: BlueprintType.stoneEmbrasure
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 64,
         imageHeight: 64,
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


   const selectOption = (option: MenuOption): void => {
      if (typeof option.makeErrorSound !== "undefined" && option.makeErrorSound()) {
         playSound("error.mp3", 0.4, 1, Player.instance!.position.x, Player.instance!.position.y);
         return;
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
            console.log(BlueprintType[blueprintType]);
            
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

   useEffect(() => {
      showBlueprintMenu = (x: number, y: number, building: Entity): void => {
         setIsVisible(true);
         setX(x);
         setY(y + 13);
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

   if (!isVisible || building === null) {
      return null;
   }

   const menuOptions = ENTITY_MENU_RECORD[building.type]!;

   const elems = new Array<JSX.Element>();
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

      let ghostType: GhostType;
      if (typeof option.ghostType === "number") {
         ghostType = option.ghostType;
      } else {
         ghostType = option.ghostType(building);
      }
      
      elems.push(
         <div key={i} onMouseOver={() => setHoveredGhostType(ghostType)} onMouseLeave={() => clearHoveredGhostType()} onClick={() => selectOption(option)} className={`structure-shaping-option${option.optionType === OptionType.deconstruct ? " deconstruct" : ""}`}>
            <div className="blueprint-name">{option.name}</div>
            {option.optionType !== OptionType.deconstruct ? (
               <div className="hotkey-label">{i + 1}</div>
            ) : undefined}
            <img src={imageSource} alt="" style={{"--width": option.imageWidth.toString(), "--height": option.imageHeight.toString()} as React.CSSProperties} />
            {typeof option.cost !== "undefined" ? (
               <div className="cost-container">
                  <img src={getItemTypeImage(option.cost.itemType)} alt="" />
                  <span>{option.cost.amount}</span>
               </div>
            ) : undefined}
         </div> 
      );
   }
   
   return <div id="blueprint-menu" onMouseEnter={() => {isHovering = true}} onMouseLeave={() => {isHovering = false}} style={{"--x": x.toString(), "--y": y.toString()} as React.CSSProperties}>
      <h1 className="title">BUILD</h1>
      {elems}
   </div>;
}

export default BlueprintMenu;

export function updateBlueprintMenu(): void {
   const selectedStructureID = getSelectedEntityID();
   if (selectedStructureID === -1 || !Board.entityRecord.hasOwnProperty(selectedStructureID)) {
      hideBlueprintMenu();
      return;
   }

   const selectedStructure = Board.entityRecord[selectedStructureID];
   if (selectedStructure.type === EntityType.wall || selectedStructure.type === EntityType.tunnel || selectedStructure.type === EntityType.door || selectedStructure.type === EntityType.embrasure) {
      const screenX = Camera.calculateXScreenPos(selectedStructure.position.x);
      const screenY = Camera.calculateYScreenPos(selectedStructure.position.y);
      showBlueprintMenu(screenX, screenY, selectedStructure);
   } else {
      hideBlueprintMenu();
   }
}