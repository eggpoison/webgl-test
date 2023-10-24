interface Options {
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
   readonly uiStyle: "old" | "new";
}

const OPTIONS: Options = {
   nightVisionIsEnabled: false,
   showHitboxes: false,
   showChunkBorders: false,
   showRenderChunkBorders: false,
   showTribeMemberHands: false,
   showParticles: false,
   uiStyle: "new"
};

export default OPTIONS;