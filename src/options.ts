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
   readonly showTribeMemberHands: boolean;
   readonly showParticles: boolean;
}

const OPTIONS: Options = {
   uiZoom: 1.75,
   nightVisionIsEnabled: false,
   showHitboxes: false,
   showChunkBorders: false,
   showRenderChunkBorders: false,
   showTribeMemberHands: true,
   showParticles: true
};

// @Cleanup: Should this exist?
document.documentElement.style.setProperty("--zoom", OPTIONS.uiZoom.toString());

export default OPTIONS;