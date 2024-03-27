import { useCallback, useEffect, useRef, useState } from "react";
import { roundNum } from "webgl-test-shared";
import OPTIONS from "../../../options";
import Board from "../../../Board";
import Camera from "../../../Camera";

let serverTicks = 0;

let tps = -1;

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
   const rangeInputRef = useRef<HTMLInputElement | null>(null);
   
   const [currentTime, setCurrentTime] = useState(0);
   const [ticks, setTicks] = useState(Board.ticks);
   const [zoom, setZoom] = useState(Camera.zoom);

   const [nightVisionIsEnabled, setNightvisionIsEnabled] = useState(OPTIONS.nightVisionIsEnabled);
   const [showHitboxes, setShowEntityHitboxes] = useState(OPTIONS.showHitboxes);
   const [showChunkBorders, setShowChunkBorders] = useState(OPTIONS.showChunkBorders);
   const [showRenderChunkBorders, setShowRenderChunkBorders] = useState(OPTIONS.showRenderChunkBorders);
   const [showPathfindingNodes, setShowPathfindingNodes] = useState(OPTIONS.showPathfindingNodes);
   const [showVulnerabilityNodes, setShowVulnerabilityNodes] = useState(OPTIONS.showVulnerabilityNodes);
   const [showBuildingVulnerabilities, setShowBuildingVulnerabilities] = useState(OPTIONS.showBuildingVulnerabilities);
   const [showBuildingPlans, setShowBuildingPlans] = useState(OPTIONS.showBuildingPlans);
   
   useEffect(() => {
      if (typeof Board.time !== "undefined") {
         setCurrentTime(Board.time);
      }

      updateDebugScreenCurrentTime = (time: number): void => {
         setCurrentTime(time);
      }
      updateDebugScreenTicks = (ticks: number): void => {
         setTicks(ticks);
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

   const toggleShowChunkBorders = useCallback(() => {
      OPTIONS.showChunkBorders = !showChunkBorders;
      setShowChunkBorders(!showChunkBorders);
   }, [showChunkBorders]);

   const toggleShowRenderChunkBorders = useCallback(() => {
      OPTIONS.showRenderChunkBorders = !showRenderChunkBorders;
      setShowRenderChunkBorders(!showRenderChunkBorders);
   }, [showRenderChunkBorders]);

   const toggleShowPathfindingNodes = useCallback(() => {
      OPTIONS.showPathfindingNodes = !showPathfindingNodes;
      setShowPathfindingNodes(!showPathfindingNodes);
   }, [showPathfindingNodes]);

   const toggleShowVulnerabilityNodes = useCallback(() => {
      OPTIONS.showVulnerabilityNodes = !showVulnerabilityNodes;
      setShowVulnerabilityNodes(!showVulnerabilityNodes);
   }, [showVulnerabilityNodes]);

   const toggleShowBuildingVulnerabilities = useCallback(() => {
      OPTIONS.showBuildingVulnerabilities = !showBuildingVulnerabilities;
      setShowBuildingVulnerabilities(!showBuildingVulnerabilities);
   }, [showBuildingVulnerabilities]);

   const toggleShowBuildingPlans = useCallback(() => {
      OPTIONS.showBuildingPlans = !showBuildingPlans;
      setShowBuildingPlans(!showBuildingPlans);
   }, [showBuildingPlans]);

   const toggleAIBuilding = useCallback(() => {
      const toggleResult = !showVulnerabilityNodes || !showBuildingVulnerabilities || !showBuildingPlans;
      
      setShowVulnerabilityNodes(toggleResult);
      setShowBuildingVulnerabilities(toggleResult);
      setShowBuildingPlans(toggleResult);

      OPTIONS.showVulnerabilityNodes = toggleResult;
      OPTIONS.showBuildingVulnerabilities = toggleResult;
      OPTIONS.showBuildingPlans = toggleResult;
   }, [showVulnerabilityNodes, showBuildingVulnerabilities, showBuildingPlans]);

   const changeZoom = () => {
      if (rangeInputRef.current === null) {
         return;
      }

      const rangeInputVal = Number(rangeInputRef.current.value);
      Camera.zoom = rangeInputVal;
      setZoom(rangeInputVal);
   }
   
   return <div id="game-info-display">
      <p>Time: {formatTime(roundNum(currentTime, 2))}</p>
      <p>Ticks: {roundNum(ticks, 2)}</p>
      <p>Server TPS: {tps}</p>

      <ul className="area options">
         <li>
            <label className={nightVisionIsEnabled ? "enabled" : undefined}>
               <input checked={nightVisionIsEnabled} name="nightvision-checkbox" type="checkbox" onChange={toggleNightvision} />
               Nightvision
            </label>
         </li>
         <li>
            <label className={showHitboxes ? "enabled" : undefined}>
               <input checked={showHitboxes} name="hitboxes-checkbox" type="checkbox" onChange={toggleShowHitboxes} />
               Hitboxes
            </label>
         </li>
         <li>
            <label className={showChunkBorders ? "enabled" : undefined}>
               <input checked={showChunkBorders} name="chunk-borders-checkbox" type="checkbox" onChange={toggleShowChunkBorders} />
               Chunk borders
            </label>
         </li>
         <li>
            <label className={showRenderChunkBorders ? "enabled" : undefined}>
               <input checked={showRenderChunkBorders} name="render-chunk-borders-checkbox" type="checkbox" onChange={toggleShowRenderChunkBorders} />
               Render chunk borders
            </label>
         </li>
         <li>
            <label className={showPathfindingNodes ? "enabled" : undefined}>
               <input checked={showPathfindingNodes} name="show-pathfinding-nodes-checkbox" type="checkbox" onChange={toggleShowPathfindingNodes} />
               Show pathfinding nodes
            </label>
         </li>
      </ul>

      <ul className="area">
         <li>{Board.entities.size} Entities</li>
         {/* @Incomplete: Subdivide into projectiles, item entities, and other */}
         <li>{Board.lowMonocolourParticles.length + Board.lowTexturedParticles.length + Board.highMonocolourParticles.length + Board.highTexturedParticles.length} Particles</li>
      </ul>

      <ul className="area">
         <li>
            <label>
               <input ref={rangeInputRef} type="range" name="zoom-input" defaultValue={Camera.zoom} min={1} max={2.25} step={0.25} onChange={changeZoom} />
               <br></br>Zoom ({zoom})
            </label>
         </li>
      </ul>

      <div className="area">
         <label className={"title" + ((showVulnerabilityNodes && showBuildingVulnerabilities && showBuildingPlans) ? " enabled" : "")}>
            AI Building
            <input checked={showVulnerabilityNodes && showBuildingVulnerabilities && showBuildingPlans} type="checkbox" onChange={toggleAIBuilding} />
         </label>
         <div>
            <label className={showVulnerabilityNodes ? "enabled" : undefined}>
               <input checked={showVulnerabilityNodes} name="show-vulnerability-nodes-checkbox" type="checkbox" onChange={toggleShowVulnerabilityNodes} />
               Show vulnerability nodes
            </label>
         </div>
         <div>
            <label className={showBuildingVulnerabilities ? "enabled" : undefined}>
               <input checked={showBuildingVulnerabilities} name="show-building-vulnerabilities-checkbox" type="checkbox" onChange={toggleShowBuildingVulnerabilities} />
               Show building vulnerabilities
            </label>
         </div>
         <div>
            <label className={showBuildingPlans ? "enabled" : undefined}>
               <input checked={showBuildingPlans} name="show-building-plans-checkbox" type="checkbox" onChange={toggleShowBuildingPlans} />
               Show building plans
            </label>
         </div>
      </div>
   </div>;
}

export default GameInfoDisplay;