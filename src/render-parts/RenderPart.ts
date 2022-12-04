import { Point } from "webgl-test-shared";

export interface RenderPartInfo {
   readonly type: "image" | "circle";
   readonly offset?: Point | (() => Point);
}

abstract class RenderPart<T extends RenderPartInfo> implements RenderPartInfo {
   public abstract readonly type: "image" | "circle";
   public readonly offset?: Point | (() => Point);
   
   constructor(renderPartInfo: T) {
      this.offset = renderPartInfo.offset;
   }
}

export default RenderPart;