import { useEffect, useReducer, useState } from "react";
import { roundNum } from "webgl-test-shared";
import Entity from "../../../entities/Entity";

export let updateDevEntityViewer: (entity?: Entity | null) => void = () => {};

const EntityViewer = () => {
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

   const displayX = roundNum(entity.position.x, 0);
   const displayY = roundNum(entity.position.y, 0);

   const displayVelocityMagnitude = entity.velocity !== null ? roundNum(entity.velocity.magnitude, 0) : 0;
   const displayAccelerationMagnitude = entity.acceleration !== null ? roundNum(entity.acceleration.magnitude, 0) : 0;

   const chunks = Array.from(entity.chunks).map(chunk => `${chunk.x}-${chunk.y}`);
   const chunkDisplayText = chunks.reduce((previousValue, chunk, idx) => {
      const newItems = previousValue.slice();
      newItems.push(
         <span key={idx} className="highlight">{chunk}</span>
      );

      if (idx < chunks.length - 1) {
         newItems.push(
            ", "
         );
      }

      return newItems;
   }, [] as Array<JSX.Element | string>);

   return <div id="dev-entity-viewer">
      <div className="title">{entity.type}<span className="id">#{entity.id}</span></div>
      
      <p>x: <span className="highlight">{displayX}</span>, y: <span className="highlight">{displayY}</span></p>

      <p>Velocity: <span className="highlight">{displayVelocityMagnitude}</span></p>
      <p>Acceleration: <span className="highlight">{displayAccelerationMagnitude}</span></p>

      <p>Chunks: {chunkDisplayText}</p>

      {typeof entity.mobAIType !== "undefined" ? <>
         <br />

         <p>Current Mob AI: <span className="highlight">{entity.mobAIType}</span></p>
      </> : null}
   </div>;
}

export default EntityViewer;