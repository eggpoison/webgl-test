import { useEffect, useRef, useState } from "react";
import { GameObjectDebugData, Point } from "webgl-test-shared";

export let updateCursorTooltip: (debugData: GameObjectDebugData | null, screenPosition: Point | null) => void = () => {};

const CursorTooltip = () => {
   const [debugData, setDebugData] = useState<GameObjectDebugData | null>(null);
   const cursorTooltipRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      updateCursorTooltip = (debugData: GameObjectDebugData | null, screenPosition: Point | null): void => {
         setDebugData(debugData);

         if (cursorTooltipRef.current !== null && screenPosition !== null) {
            cursorTooltipRef.current.style.bottom = screenPosition.y + "px";
            cursorTooltipRef.current.style.left = screenPosition.x + "px";
         }
      }
   }, []);

   let healthText: string | undefined;
   if (debugData !== null && typeof debugData.health !== "undefined" && typeof debugData.maxHealth !== "undefined") {
      healthText = debugData.health + "/" + debugData.maxHealth;
   }

   return typeof healthText !== "undefined" ? <div id="cursor-tooltip" ref={cursorTooltipRef}>
      <p>{healthText}</p>
   </div> : null;
}

export default CursorTooltip;