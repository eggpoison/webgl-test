import RenderPart, { RenderPartInfo } from "./RenderPart";

interface CircleRenderPartInfo extends RenderPartInfo {
   readonly type: "circle";
   readonly rgba: [number, number, number, number];
   readonly radius: number;
}

class CircleRenderPart extends RenderPart<CircleRenderPartInfo> {
   public readonly type = "circle";
   public readonly rgba: [number, number, number, number];
   public readonly radius: number;
   constructor(renderPartInfo: CircleRenderPartInfo) {
      super(renderPartInfo);

      this.rgba = renderPartInfo.rgba;
      this.radius = renderPartInfo.radius;
   }
}

export default CircleRenderPart;