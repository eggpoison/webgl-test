import { useEffect, useRef, useState } from "react";
import { GameObjectDebugData, Point } from "webgl-test-shared";
import CLIENT_ENTITY_INFO_RECORD from "../../../client-entity-info";
import Entity from "../../../entities/Entity";

export let updateCursorTooltip: (entity: Entity | null, debugData: GameObjectDebugData | null, screenPosition: Point | null) => void = () => {};

const CursorTooltip = () => {
   const [entity, setEntity] = useState<Entity | null>(null);
   const [debugData, setDebugData] = useState<GameObjectDebugData | null>(null);
   const cursorTooltipRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      updateCursorTooltip = (entity: Entity | null, debugData: GameObjectDebugData | null, screenPosition: Point | null): void => {
         setEntity(entity);
         setDebugData(debugData);

         if (cursorTooltipRef.current !== null && screenPosition !== null) {
            cursorTooltipRef.current.style.top = screenPosition.y + "px";
            cursorTooltipRef.current.style.left = screenPosition.x + "px";
         }
      }
   }, []);

   let healthText: string | undefined;
   if (debugData !== null && typeof debugData.health !== "undefined" && typeof debugData.maxHealth !== "undefined") {
      healthText = debugData.health + "/" + debugData.maxHealth;
   }

   return entity !== null || debugData !== null ? <div id="cursor-tooltip" ref={cursorTooltipRef}>
      <p>{entity !== null ? CLIENT_ENTITY_INFO_RECORD[entity.type].name : undefined}</p>
      <p>{healthText}</p>
   </div> : null;
}

export default CursorTooltip;