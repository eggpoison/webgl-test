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
}

const OPTIONS: Options = {
   nightVisionIsEnabled: false,
   showHitboxes: false,
   showChunkBorders: false
};

export default OPTIONS;