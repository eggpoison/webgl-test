import { useCallback, useEffect, useState } from "react";
import { SETTINGS, roundNum } from "webgl-test-shared";
import Game from "../../../Game";
import OPTIONS from "../../../options";

let _fps: number = -1;

const fpsTimers = new Array<number>();

let serverTicks = 0;

let tps = -1;

/** Registers that a frame has occured for use in showing the fps counter */
export function registerFrame(): void {
   fpsTimers.push(1);
}

export function updateFrameCounter(deltaTime: number): void {
   for (let i = fpsTimers.length - 1; i >= 0; i--) {
      fpsTimers[i] -= deltaTime;
      if (fpsTimers[i] <= 0) {
         fpsTimers.splice(i, 1);
      }
   }
}

export let updateDebugScreenCurrentTime: (time: number) => void = () => {};
export let updateDebugScreenTicks: (time: number) => void = () => {};
export let updateDebugScreenFPS: () => void = () => {};
export let updateDebugScreenRenderTime: (renderTime: number) => void = () => {};

export function registerServerTick(): void {
   serverTicks++;
}

export function clearServerTicks(): void {
   tps = serverTicks;
   serverTicks = 0;
}

const formatTime = (time: number): string => {
   let timeString = Math.floor(time).toString() + ".";

   if (time % 1 === 0) {
      timeString += "0";
   } else {
      timeString += Math.round((time * 10) % 10);
   }

   if (time % 0.1 === 0) {
      timeString += "0";
   } else {
      timeString += Math.round((time * 100) % 10);
   }

   return timeString;
}

const GameInfoDisplay = () => {
   const [currentTime, setCurrentTime] = useState(0);
   const [ticks, setTicks] = useState(Game.ticks);
   const [fps, setFPS] = useState(0);
   const [renderTime, setRenderTime] = useState(0);

   const [nightVisionIsEnabled, setNightvisionIsEnabled] = useState(OPTIONS.nightVisionIsEnabled);
   const [showHitboxes, setShowEntityHitboxes] = useState(OPTIONS.showHitboxes);
   const [showChunkBorders, setShowChunkBorders] = useState(OPTIONS.showChunkBorders);

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
      updateDebugScreenFPS = (): void => {
         setFPS(fpsTimers.length);
      }
      updateDebugScreenRenderTime = (renderTime: number): void => {
         setRenderTime(renderTime);
      }
   }, []);

   const toggleNightvision = useCallback(() => {
      OPTIONS.nightVisionIsEnabled = !nightVisionIsEnabled;
      setNightvisionIsEnabled(!nightVisionIsEnabled);
   }, [nightVisionIsEnabled]);

   const toggleShowHitboxes = useCallback(() => {
      OPTIONS.showHitboxes = !showHitboxes;
      setShowEntityHitboxes(!showHitboxes);
   }, [showHitboxes]);

   const toggleSetShowChunkBorders = useCallback(() => {
      OPTIONS.showChunkBorders = !showChunkBorders;
      setShowChunkBorders(!showChunkBorders);
   }, [showChunkBorders]);
   
   return <div id="game-info-display">
      <p>Time: {formatTime(roundNum(currentTime, 2))}</p>
      <p>Ticks: {roundNum(ticks, 2)}</p>
      <p>FPS: {fps}</p>
      <p>Render time ms: {renderTime.toFixed(2)}</p>
      <p>TPS: {tps}</p>

      <ul className="options">
         <li>
            <label className={nightVisionIsEnabled ? "enabled" : undefined}>
               <input checked={nightVisionIsEnabled} type="checkbox" onChange={toggleNightvision} />
               Nightvision
            </label>
         </li>
         <li>
            <label className={showHitboxes ? "enabled" : undefined}>
               <input checked={showHitboxes} type="checkbox" onChange={toggleShowHitboxes} />
               Hitboxes
            </label>
         </li>
         <li>
            <label className={showChunkBorders ? "enabled" : undefined}>
               <input checked={showChunkBorders} type="checkbox" onChange={toggleSetShowChunkBorders} />
               Chunk borders
            </label>
         </li>
      </ul>

      <ul>
         <li>
            <label>
               {Object.keys(Game.board.gameObjects).length} Game Objects
            </label>
         </li>
         <ul>
            <li>
               <label>
                  {Object.keys(Game.board.entities).length} Entities
               </label>
            </li>
            <li>
               <label>
                  {Object.keys(Game.board.projectiles).length} Projectiles
               </label>
            </li>
            <li>
               <label>
                  {Object.keys(Game.board.droppedItems).length} Dropped Items
               </label>
            </li>
         </ul>
         <li>
            <label>
               {Object.keys(Game.board.particles).length} Particles
            </label>
         </li>
      </ul>
   </div>;
}

export default GameInfoDisplay;