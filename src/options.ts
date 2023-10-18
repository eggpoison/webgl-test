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
   showTribeMemberHands: boolean;
}

const OPTIONS: Options = {
   nightVisionIsEnabled: false,
   showHitboxes: false,
   showChunkBorders: false,
   showRenderChunkBorders: false,
   showTribeMemberHands: true
};

export default OPTIONS;