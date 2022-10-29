import { Point } from "webgl-test-shared";
import Entity from "../entities/Entity";

export interface RenderPartInfo {
   readonly type: "image" | "circle";
   readonly offset?: Point | (() => Point);
   readonly zIndex: number;
}

abstract class RenderPart<T extends RenderPartInfo> implements RenderPartInfo {
   public readonly entity: Entity;
   public readonly arrayIdx: number;
   
   public abstract readonly type: "image" | "circle";
   public readonly offset?: Point | (() => Point);
   public readonly zIndex: number;
   
   constructor(renderPartInfo: T, entity: Entity, arrayIdx: number) {
      this.entity = entity;
      this.arrayIdx = arrayIdx;
      
      this.offset = renderPartInfo.offset;
      this.zIndex = renderPartInfo.zIndex;
   }
}

export default RenderPart;