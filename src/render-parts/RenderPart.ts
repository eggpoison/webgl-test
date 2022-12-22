import { Point } from "webgl-test-shared";

export interface RenderPartInfo {
   readonly offset?: Point | (() => Point);
   readonly width: number;
   readonly height: number;
   readonly textureSource: string;
}

class RenderPart implements RenderPartInfo {
   public readonly offset?: Point | (() => Point);
   public readonly width: number;
   public readonly height: number;
   public readonly textureSource: string;
   
   constructor(renderPartInfo: RenderPartInfo) {
      this.offset = renderPartInfo.offset;
      this.width = renderPartInfo.width;
      this.height = renderPartInfo.height;
      this.textureSource = renderPartInfo.textureSource;
   }
}

export default RenderPart;