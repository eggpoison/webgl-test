import { useEffect, useRef, useState } from "react";
import { getSelectedStructureID } from "../../structure-selection";
import Board from "../../Board";
import Camera from "../../Camera";
import Client from "../../client/Client";
import { EntityType, StructureShapeType } from "webgl-test-shared";
import { playSound } from "../../sound";
import Player from "../../entities/Player";
import { addKeyListener } from "../../keyboard-input";

let showStructureShapingMenu: (x: number, y: number) => void;
let hideStructureShapingMenu: () => void = () => {};

let hoveredShapeType = -1;
export function getHoveredShapeType(): StructureShapeType | -1 {
   return hoveredShapeType;
}

let isHovering = false;
export function isHoveringInBlueprintMenu(): boolean {
   return isHovering;
}

const TYPES: ReadonlyArray<StructureShapeType> = [StructureShapeType.door, StructureShapeType.embrasure];
const NAMES: ReadonlyArray<string> = ["DOOR", "EMBRASURE"]
const IMAGE_SOURCES: ReadonlyArray<string> = [require("../../images/entities/wooden-door/wooden-door.png"), require("../../images/entities/wooden-embrasure/wooden-embrasure.png")];
const IMAGE_WIDTHS = [64, 64];
const IMAGE_HEIGHTS = [24, 20];

// @Cleanup @Hack
let _isVisible = false;

const BlueprintMenu = () => {
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [isVisible, setIsVisible] = useState(false);
   const hasLoaded = useRef(false);

   const shapeStructure = (type: StructureShapeType): void => {
      const selectedStructureID = getSelectedStructureID();
      Client.sendShapeStructure(selectedStructureID, type);

      // @Incomplete
      playSound("blueprint-place.mp3", 0.4, Player.instance!.position.x, Player.instance!.position.y);
   }

   useEffect(() => {
      if (!hasLoaded.current) {
         hasLoaded.current = true;

         for (let i = 0; i < 2; i++) {
            // @Cleanup
            // eslint-disable-next-line no-loop-func
            addKeyListener((i + 1).toString(), () => {
               if (_isVisible) {
                  shapeStructure(TYPES[i]);
               }
            });
         }
      }

      showStructureShapingMenu = (x: number, y: number): void => {
         _isVisible = true;
         setIsVisible(true);
         setX(x);
         setY(y + 27);
      }

      hideStructureShapingMenu = (): void => {
         hoveredShapeType = -1;
         isHovering = false;
         _isVisible = false;
         setIsVisible(false);
      }
   }, []);

   const hoverOption = (type: StructureShapeType): void => {
      hoveredShapeType = type;
   }

   const unhoverOption = (): void => {
      hoveredShapeType = -1;
   }

   if (!isVisible) {
      return null;
   }

   const elems = new Array<JSX.Element>();
   for (let i = 0; i < TYPES.length; i++) {
      const type = TYPES[i];

      elems.push(
         <div key={i} onMouseOver={() => hoverOption(type)} onMouseLeave={() => unhoverOption()} onClick={() => shapeStructure(type)} className="structure-shaping-option">
            <div className="blueprint-name">{NAMES[i]}</div>
            <div className="hotkey-label">{i + 1}</div>
            <img src={IMAGE_SOURCES[i]} alt="" style={{"--width": IMAGE_WIDTHS[i].toString(), "--height": IMAGE_HEIGHTS[i].toString()} as React.CSSProperties} />
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
   const selectedStructureID = getSelectedStructureID();
   if (selectedStructureID === -1 || !Board.entityRecord.hasOwnProperty(selectedStructureID)) {
      hideStructureShapingMenu();
      return;
   }

   const selectedStructure = Board.entityRecord[selectedStructureID];
   if (selectedStructure.type !== EntityType.woodenWall && selectedStructure.type !== EntityType.woodenEmbrasure) {
      hideStructureShapingMenu();
      return;
   }
   
   const screenX = Camera.calculateXScreenPos(selectedStructure.position.x);
   const screenY = Camera.calculateYScreenPos(selectedStructure.position.y);
   showStructureShapingMenu(screenX, screenY);
}