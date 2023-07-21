import { useEffect, useState } from "react";
import { roundNum } from "webgl-test-shared";
import Game from "../../../Game";

let _fps: number = -1;

let serverTicks = 0;

let tps = -1;

export let updateDebugScreenCurrentTime: (time: number) => void = () => {};
export let updateDebugScreenTicks: (time: number) => void = () => {};
export let updateDebugScreenFPS: (fps: number) => void = (fps: number) => { _fps = fps};

export function registerServerTick(): void {
   serverTicks++;
}

export function clearServerTicks(): void {
   tps = serverTicks;
   serverTicks = 0;
}

const GameInfoDisplay = () => {
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
         _fps = fps;
         setFPS(fps);
      }
   }, []);
   
   return <div id="game-info-display">
      <p>Time: {roundNum(currentTime, 2)}</p>
      <p>Ticks: {roundNum(ticks, 2)}</p>
      <p>FPS: {_fps}</p>
      <p>TPS: {tps}</p>
   </div>;
}

export default GameInfoDisplay;