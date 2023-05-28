import { useEffect, useRef, useState } from "react";
import { Point } from "webgl-test-shared";
import CLIENT_ENTITY_INFO_RECORD from "../../../client-entity-info";
import Entity from "../../../entities/Entity";
import { isDev } from "../../../utils";
import { updateDevEntityViewer } from "./EntityViewer";

export let updateCursorTooltipTarget: (entity: Entity | null, screenPosition: Point | null) => void = () => {};

const CursorTooltip = () => {
   const [target, setTarget] = useState<Entity | null>(null);
   const cursorTooltipRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      updateCursorTooltipTarget = (entity: Entity | null, screenPosition: Point | null): void => {
         setTarget(entity);

         if (cursorTooltipRef.current !== null && screenPosition !== null) {
            cursorTooltipRef.current.style.top = screenPosition.y + "px";
            cursorTooltipRef.current.style.left = screenPosition.x + "px";
         }

         if (isDev()) {
            updateDevEntityViewer(entity);
         }
      }
   }, []);

   let displayText: string;
   if (target !== null) {
      const name = CLIENT_ENTITY_INFO_RECORD[target.type].name;
      displayText = `${name}`;
   }

   return target !== null ? <div id="cursor-tooltip" ref={cursorTooltipRef}>
      {displayText!}
   </div> : null;
}

export default CursorTooltip;