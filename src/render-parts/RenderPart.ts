import { Point } from "webgl-test-shared";
import Entity from "../entities/Entity";

export interface RenderPartInfo {
   /** The entity the render part is attached to */
   readonly entity: Entity;
   /** Offset of the render part from the entity's position */
   readonly offset?: () => Point;
   /** Width of the render part */
   readonly width: number;
   /** Height of the render part */
   readonly height: number;
   readonly textureSource: string;
   /** Render priority of the render part in relation to its entity's other render parts. */
   readonly zIndex: number;
}

class RenderPart implements RenderPartInfo {
   public readonly entity: Entity;
   public readonly offset?: () => Point;
   public readonly width: number;
   public readonly height: number;
   public readonly textureSource: string;
   public readonly zIndex: number;
   
   constructor(renderPartInfo: RenderPartInfo) {
      this.entity = renderPartInfo.entity;
      this.offset = renderPartInfo.offset;
      this.width = renderPartInfo.width;
      this.height = renderPartInfo.height;
      this.textureSource = renderPartInfo.textureSource;
      this.zIndex = renderPartInfo.zIndex;
   }
}

export default RenderPart;