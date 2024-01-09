import { useEffect, useState } from "react";
import { getSelectedStructureID } from "../../structure-selection";
import Board from "../../Board";
import Camera from "../../Camera";
import Client from "../../client/Client";
import { EntityType, StructureShapeType } from "webgl-test-shared";

let showStructureShapingMenu: (x: number, y: number) => void;
let hideStructureShapingMenu: () => void = () => {};

const StructureShapingMenu = () => {
   const [isVisible, setIsVisible] = useState(false);
   const [x, setX] = useState(-1);
   const [y, setY] = useState(-1);

   useEffect(() => {
      showStructureShapingMenu = (x: number, y: number): void => {
         setIsVisible(true);
         setX(x);
         setY(y + 100);
      }

      hideStructureShapingMenu = (): void => {
         setIsVisible(false);
      }
   }, []);


   if (!isVisible) {
      return null;
   }

   const shapeStructure = (): void => {
      Client.sendShapeStructure(getSelectedStructureID(), StructureShapeType.door);
   }
   
   return <>
      <div onClick={shapeStructure} className="structure-shaping-option" style={{"--end-x": x, "--end-y": y} as React.CSSProperties}>
         <img src={require("../../images/entities/wooden-door/wooden-door.png")} alt="" />
      </div>
   </>;
}

export default StructureShapingMenu;

export function updateStructureShapingMenu(): void {
   const selectedStructureID = getSelectedStructureID();
   if (selectedStructureID === -1 || !Board.entityRecord.hasOwnProperty(selectedStructureID)) {
      hideStructureShapingMenu();
      return;
   }

   const selectedStructure = Board.entityRecord[selectedStructureID];
   if (selectedStructure.type !== EntityType.woodenWall) {
      hideStructureShapingMenu();
      return;
   }
   
   const screenX = Camera.calculateXScreenPos(selectedStructure.position.x);
   const screenY = Camera.calculateYScreenPos(selectedStructure.position.y);
   showStructureShapingMenu(screenX, screenY);
}