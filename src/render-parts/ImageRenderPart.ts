import Entity from "../entities/Entity";
import RenderPart, { RenderPartInfo } from "./RenderPart";

interface ImageRenderPartInfo extends RenderPartInfo {
   readonly type: "image";
   readonly width: number;
   readonly height: number;
   readonly textureSrc: string;
}

class ImageRenderPart extends RenderPart<ImageRenderPartInfo> implements ImageRenderPartInfo {
   public readonly type = "image";
   public readonly width: number;
   public readonly height: number;
   public readonly textureSrc: string;

   constructor(renderPartInfo: ImageRenderPartInfo, entity: Entity, arrayIdx: number) {
      super(renderPartInfo, entity, arrayIdx);

      this.width = renderPartInfo.width;
      this.height = renderPartInfo.height;
      this.textureSrc = renderPartInfo.textureSrc;
   }
}

export default ImageRenderPart;