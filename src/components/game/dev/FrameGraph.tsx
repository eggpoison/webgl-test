import { useEffect, useState } from "react";
import { FRAME_GRAPH_RECORD_TIME, renderFrameGraph } from "../../../rendering/frame-graph-rendering";

export interface FrameInfo {
   readonly startTime: number;
   readonly endTime: number;
}

const trackedFrames = new Array<FrameInfo>();

/** Registers that a frame has occured for use in showing the fps counter */
export function registerFrame(frameStartTime: number, frameEndTime: number): void {
   trackedFrames.push({
      startTime: frameStartTime,
      endTime: frameEndTime
   });
}

export let updateFrameGraph: () => void = () => {};

// export function updateFrameCounter(deltaTime: number): void {
//    for (let i = fpsTimers.length - 1; i >= 0; i--) {
//       fpsTimers[i] -= deltaTime;
//       if (fpsTimers[i] <= 0) {
//          fpsTimers.splice(i, 1);
//       }
//    }
// }

export let showFrameGraph: () => void;
export let hideFrameGraph: () => void;

const FrameGraph = (): JSX.Element => {
   const [isVisible, setIsVisible] = useState(false);
   const [fps, setFPS] = useState(-1);
   
   useEffect(() => {
      showFrameGraph = (): void => {
         setIsVisible(true);
      }
      hideFrameGraph = (): void => {
         setIsVisible(false);
      }
      
      updateFrameGraph = (): void => {
         const renderTime = performance.now();
         const now = renderTime / 1000;
         // Remove old frames
         for (let i = trackedFrames.length - 1; i >= 0; i--) {
            const frame = trackedFrames[i];
            const timeSince = now - (frame.endTime / 1000);
            if (timeSince > FRAME_GRAPH_RECORD_TIME) {
               trackedFrames.splice(i, 1);
            }
         }

         const fps = trackedFrames.length / FRAME_GRAPH_RECORD_TIME;
         setFPS(fps);
         
         renderFrameGraph(renderTime, trackedFrames);
      }

      return () => {
         updateFrameGraph = () => {};
      }
   }, []);
   
   return <div id="frame-graph" className={!isVisible ? "hidden" : undefined}>
      <p className="fps">FPS {fps}</p>
      <canvas id="frame-graph-canvas"></canvas>
   </div>;
}

export default FrameGraph;