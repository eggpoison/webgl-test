import { useEffect, useRef, useState } from "react";
import { GameObjectDebugData } from "webgl-test-shared";

export let updateCursorTooltip: (debugData: GameObjectDebugData | null, screenPositionX: number, screenPositionY: number) => void = () => {};

const CursorTooltip = () => {
   const [debugData, setDebugData] = useState<GameObjectDebugData | null>(null);
   const cursorTooltipRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      updateCursorTooltip = (debugData: GameObjectDebugData | null, screenPositionX: number, screenPositionY: number): void => {
         setDebugData(debugData);

         if (cursorTooltipRef.current !== null) {
            cursorTooltipRef.current.style.bottom = screenPositionY + "px";
            cursorTooltipRef.current.style.left = screenPositionX + "px";
         }
      }
   }, []);

   let healthText: string | undefined;
   if (debugData !== null && typeof debugData.health !== "undefined" && typeof debugData.maxHealth !== "undefined") {
      const health = debugData.health.toFixed(2);
      const maxHealth = debugData.maxHealth.toFixed(2);
      healthText = health + "/" + maxHealth;
   }

   return typeof healthText !== "undefined" ? <div id="cursor-tooltip" ref={cursorTooltipRef}>
      <p>{healthText}</p>
   </div> : null;
}

export default CursorTooltip;