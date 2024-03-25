interface Options {
   uiZoom: number;
   nightVisionIsEnabled: boolean;
   /**
    * If true, then all entity hitboxes will be shown
    * @default false
    */
   showHitboxes: boolean;
   /**
    * If true, then chunk borders will be displayed in a wireframe.
    * @default false
    */
   showChunkBorders: boolean;
   /**
    * If true, then render chunk borders will be displayed in a wireframe.
    * @default false
    */
   showRenderChunkBorders: boolean;
   readonly showParticles: boolean;
   readonly showAllTechs: boolean;
   showPathfindingNodes: boolean;
   showVulnerabilityNodes: boolean;
}

const OPTIONS: Options = {
   // @Temporary
   // uiZoom: 1.4,
   uiZoom: 1,
   nightVisionIsEnabled: false,
   showHitboxes: false,
   showChunkBorders: false,
   showRenderChunkBorders: false,
   showParticles: true,
   showAllTechs: false,
   showPathfindingNodes: false,
   showVulnerabilityNodes: false
};

document.documentElement.style.setProperty("--zoom", OPTIONS.uiZoom.toString());

export default OPTIONS;