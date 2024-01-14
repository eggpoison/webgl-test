import { useEffect, useState } from "react";
import { getSelectedStructureID } from "../../structure-selection";
import Board from "../../Board";
import Camera from "../../Camera";
import Client from "../../client/Client";
import { EntityType, StructureShapeType, randFloat } from "webgl-test-shared";
import { playSound } from "../../sound";
import Particle from "../../Particle";
import { ParticleRenderLayer, addTexturedParticleToBufferContainer } from "../../rendering/particle-rendering";

let showStructureShapingMenu: (x: number, y: number) => void;
let hideStructureShapingMenu: () => void = () => {};

const createSawdustCloud = (x: number, y: number): void => {
   const lifetime = randFloat(0.4, 0.7);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const opacity = randFloat(0.7, 1);
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return (1 - particle.age / lifetime) * opacity;
   };
   
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      6 * 8,
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}

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

      const selectedStructureID = getSelectedStructureID();
      const selectedStructure = Board.entityRecord[selectedStructureID];

      playSound("structure-shaping.mp3", 0.4, selectedStructure.position.x, selectedStructure.position.y);

      for (let i = 0; i < 5; i++) {
         const x = selectedStructure.position.x + randFloat(-32, 32);
         const y = selectedStructure.position.y + randFloat(-32, 32);
         createSawdustCloud(x, y);
      }
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