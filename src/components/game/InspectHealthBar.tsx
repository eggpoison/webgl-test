import { useEffect, useState } from "react";
import Entity from "../../Entity"
import Camera from "../../Camera";
import { ServerComponentType } from "webgl-test-shared";
import Board from "../../Board";
import { getHoveredEntityID } from "../../entity-selection";
import Game from "../../Game";
import Player from "../../entities/Player";
import { latencyGameState } from "../../game-state/game-states";

let InspectHealthBar_setEntity: (entity: Entity | null) => void = () => {};
let InspectHealthBar_setPos: (x: number, y: number) => void;
let InspectHealthBar_setHealth: (health: number) => void;

const InspectHealthBar = () => {
   const [entity, setEntity] = useState<Entity | null>(null);
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [health, setHealth] = useState(0);
   
   useEffect(() => {
      InspectHealthBar_setEntity = (entity: Entity | null): void => {
         setEntity(entity);
      }
      InspectHealthBar_setPos = (x: number, y: number): void => {
         setX(x);
         setY(y);
      }
      InspectHealthBar_setHealth = (health: number): void => {
         setHealth(health);
      }
   }, []);

   // @Temporary
   if (entity === null || 1+1===2) {
      return null;
   }
   
   const healthComponent = entity.getServerComponent(ServerComponentType.health);
   
   return <div id="inspect-health-bar" style={{left: x + "px", bottom: y + "px"}}>
      <div className="health-slider" style={{width: (health / healthComponent.maxHealth) * 100 + "%"}}></div>
      <div className="health-counter-container">
         <span>{healthComponent.health}</span>
      </div>
   </div>;
}

export default InspectHealthBar;

export function updateInspectHealthBar(): void {
   if (Player.instance === null || latencyGameState.playerIsPlacingEntity) {
      InspectHealthBar_setEntity(null);
      return;
   }
   
   const hoveredEntityID = getHoveredEntityID();
   if (hoveredEntityID === Player.instance.id) {
      InspectHealthBar_setEntity(null);
      return;
   }

   if (!Board.entityRecord.hasOwnProperty(hoveredEntityID)) {
      InspectHealthBar_setEntity(null);
      return;
   }

   const hoveredEntity = Board.entityRecord[hoveredEntityID];
   if (!hoveredEntity.hasServerComponent(ServerComponentType.health)) {
      InspectHealthBar_setEntity(null);
      return;
   }

   // Only show health for friendly tribe buildings/tribesman
   if (!hoveredEntity.hasServerComponent(ServerComponentType.tribe) || hoveredEntity.getServerComponent(ServerComponentType.tribe).tribeID !== Game.tribe.id) {
      InspectHealthBar_setEntity(null);
      return;
   }

   InspectHealthBar_setEntity(hoveredEntity);

   const healthComponent = hoveredEntity.getServerComponent(ServerComponentType.health);
   InspectHealthBar_setHealth(healthComponent.health);

   const screenX = Camera.calculateXScreenPos(hoveredEntity.position.x);
   const screenY = Camera.calculateYScreenPos(hoveredEntity.position.y);
   InspectHealthBar_setPos(screenX, screenY);
}