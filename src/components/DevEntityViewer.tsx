import { useEffect, useReducer, useState } from "react";
import { roundNum } from "webgl-test-shared";
import CLIENT_ENTITY_INFO_RECORD from "../client-entity-info";
import Entity from "../entities/Entity";

export let updateDevEntityViewer: (entity?: Entity | null) => void;

const DevEntityViewer = () => {
   const [entity, setEntity] = useState<Entity | null>(null);
   const [, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      updateDevEntityViewer = (entity?: Entity | null): void => {
         if (typeof entity !== "undefined") {
            setEntity(entity);
         } else {
            forceUpdate();
         }
      }
   }, []);

   if (entity === null) return null;

   const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[entity.type];

   const displayX = roundNum(entity.position.x, 0);
   const displayY = roundNum(entity.position.y, 0);

   const displayVelocityMagnitude = entity.velocity !== null ? roundNum(entity.velocity.magnitude, 0) : 0;
   const displayAccelerationMagnitude = entity.acceleration !== null ? roundNum(entity.acceleration.magnitude, 0) : 0;

   return <div id="dev-entity-viewer">
      <h1>{clientEntityInfo.name}</h1>
      
      <p>x: <span className="highlight">{displayX}</span>, y: <span className="highlight">{displayY}</span></p>

      <p>Velocity: <span className="highlight">{displayVelocityMagnitude}</span></p>
      <p>Acceleration: <span className="highlight">{displayAccelerationMagnitude}</span></p>
   </div>;
}

export default DevEntityViewer;