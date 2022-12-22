import { useEffect, useState } from "react";
import { roundNum } from "webgl-test-shared";
import Game from "../../Game";

export let updateDebugScreenCurrentTime: (time: number) => void;
export let updateDebugScreenTicks: (time: number) => void;
export let updateDebugScreenFPS: (fps: number) => void;

const DebugScreen = () => {
   const [currentTime, setCurrentTime] = useState(0);
   const [ticks, setTicks] = useState(0);
   const [fps, setFPS] = useState(-1);

   useEffect(() => {
      if (typeof Game.time !== "undefined") {
         setCurrentTime(Game.time);
      }

      updateDebugScreenCurrentTime = (time: number): void => {
         setCurrentTime(time);
      }
      updateDebugScreenTicks = (ticks: number): void => {
         setTicks(ticks);
      }
      updateDebugScreenFPS = (fps: number): void => {
         setFPS(fps);
      }
   }, []);
   
   return <div id="debug-screen">
      <div className="server-info">
         <p>Time: {roundNum(currentTime, 2)}</p>
         <p>Ticks: {roundNum(ticks, 2)}</p>
         <p>FPS: {fps}</p>
      </div>
   </div>;
}

export default DebugScreen;