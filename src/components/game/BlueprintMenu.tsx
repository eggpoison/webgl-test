import { useEffect, useState } from "react";
import { deselectSelectedEntity, getSelectedEntityID } from "../../entity-selection";
import Board from "../../Board";
import Camera from "../../Camera";
import Client from "../../client/Client";
import { BuildingShapeType, EntityType, ItemType } from "webgl-test-shared";
import { GhostType } from "../../rendering/placeable-item-rendering";
import { getItemTypeImage } from "../../client-item-info";
import Entity from "../../Entity";

let showBlueprintMenu: (x: number, y: number, setEntityType: EntityType) => void;
export let hideBlueprintMenu: () => void = () => {};

export interface BuildingShapeInfo {
   readonly shapeType: BuildingShapeType;
   /** Extra information like which doors are on a tunnel */
   readonly extraData: number;
}

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
   construct,
   deconstruct
}

interface OptionCost {
   readonly itemType: ItemType;
   readonly amount: number;
}

interface MenuOption {
   readonly name: string;
   readonly imageSource: string;
   readonly imageWidth: number;
   readonly imageHeight: number;
   /** The type of the ghost which gets shown when previewing this option */
   readonly ghostType: GhostType;
   readonly optionType: OptionType;
   readonly cost?: OptionCost;
   readonly requirement?: (entity: Entity) => boolean;
}

const ENTITY_MENU_RECORD: Partial<Record<EntityType, ReadonlyArray<MenuOption>>> = {
   [EntityType.wall]: [
      {
         name: "UPGRADE",
         imageSource: require("../../images/entities/wall/stone-wall.png"),
         imageWidth: 64,
         imageHeight: 64,
         ghostType: GhostType.stoneWall,
         optionType: OptionType.construct,
         cost: {
            itemType: ItemType.rock,
            amount: 5
         },
         requirement: (wall: Entity) => {
            const wallComponent = ServerCOmp
            return 
         }
      },
      {
         name: "DOOR",
         imageSource: require("../../images/entities/wooden-door/wooden-door.png"),
         imageWidth: 64,
         imageHeight: 24,
         ghostType: GhostType.woodenDoor,
         optionType: OptionType.construct
      },
      {
         name: "EMBRASURE",
         imageSource: require("../../images/entities/wooden-embrasure/wooden-embrasure.png"),
         imageWidth: 64,
         imageHeight: 20,
         ghostType: GhostType.woodenEmbrasure,
         optionType: OptionType.construct
      },
      {
         name: "TUNNEL",
         imageSource: require("../../images/entities/wooden-tunnel/wooden-tunnel.png"),
         imageWidth: 64,
         imageHeight: 64,
         ghostType: GhostType.woodenTunnel,
         optionType: OptionType.construct
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 64,
         imageHeight: 64,
         ghostType: GhostType.deconstructMarker,
         optionType: OptionType.deconstruct
      }
   ],
   [EntityType.woodenTunnel]: [
      {
         name: "DOOR",
         imageSource: require("../../images/entities/wooden-tunnel/wooden-tunnel.png"),
         imageWidth: 64,
         imageHeight: 64,
         ghostType: GhostType.tunnelDoor,
         optionType: OptionType.construct
      },
      {
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 64,
         imageHeight: 64,
         ghostType: GhostType.deconstructMarker,
         optionType: OptionType.deconstruct
      }
   ]
};

const BlueprintMenu = () => {
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [isVisible, setIsVisible] = useState(false);
   const [entityType, setEntityType] = useState(EntityType.wall);

   const menuOptions = ENTITY_MENU_RECORD[entityType]!;

   const selectOption = (optionIdx: number): void => {
      const selectedStructureID = getSelectedEntityID();
      Client.sendShapeStructure(selectedStructureID, optionIdx);

      deselectSelectedEntity();
   }

   useEffect(() => {
      showBlueprintMenu = (x: number, y: number, menuEntityType: EntityType): void => {
         setIsVisible(true);
         setX(x);
         setY(y + 13);
         setEntityType(menuEntityType);
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

   if (!isVisible) {
      return null;
   }

   const elems = new Array<JSX.Element>();
   for (let i = 0; i < menuOptions.length; i++) {
      const option = menuOptions[i];

      elems.push(
         <div key={i} onMouseOver={() => setHoveredGhostType(option.ghostType)} onMouseLeave={() => clearHoveredGhostType()} onClick={() => selectOption(i)} className={`structure-shaping-option${option.optionType === OptionType.deconstruct ? " deconstruct" : ""}`}>
            <div className="blueprint-name">{option.name}</div>
            {option.optionType !== OptionType.deconstruct ? (
               <div className="hotkey-label">{i + 1}</div>
            ) : undefined}
            <img src={option.imageSource} alt="" style={{"--width": option.imageWidth.toString(), "--height": option.imageHeight.toString()} as React.CSSProperties} />
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
   if (selectedStructure.type === EntityType.wall || selectedStructure.type === EntityType.woodenTunnel) {
      const screenX = Camera.calculateXScreenPos(selectedStructure.position.x);
      const screenY = Camera.calculateYScreenPos(selectedStructure.position.y);
      showBlueprintMenu(screenX, screenY, selectedStructure.type);
   } else {
      hideBlueprintMenu();
   }
}