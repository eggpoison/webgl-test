import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";

export interface RenderPartInfo {
   /** The render part's offset from its parent */
   readonly offset?: Point | (() => Point);
   /** Width of the render part */
   readonly width: number;
   /** Height of the render part */
   readonly height: number;
   readonly textureSource: string;
   /** Render priority of the render part in relation to its entity's other render parts. */
   readonly zIndex: number;
   /** Rotation of the render part in radians */
   readonly getRotation?: () => number;
   readonly inheritParentRotation?: boolean;
   readonly opacity?: number;
   readonly flipX?: boolean;
}

/** A thing which is able to hold render parts */
export class RenderObject {
   /** Estimated position of the object during the current frame */
   public renderPosition = new Point(-1, -1);

   public rotation = 0;
   
   public readonly renderParts = new Array<RenderPart>();

   public attachRenderParts(renderParts: ReadonlyArray<RenderPart>): void {
      for (const renderPart of renderParts) {
         this.attachRenderPart(renderPart);
      }
   }

   public attachRenderPart(renderPart: RenderPart): void {
      // Find an index for the render part
      let idx = 0;
      for (idx = 0; idx < this.renderParts.length; idx++) {
         const currentRenderPart = this.renderParts[idx];
         if (renderPart.zIndex <= currentRenderPart.zIndex) {
            break;
         }
      }

      // Insert the render part at the index
      this.renderParts.splice(idx, 0, renderPart);
   }

   public removeRenderPart(renderPart: RenderPart): void {
      const idx = this.renderParts.indexOf(renderPart);
      if (idx !== -1) {
         this.renderParts.splice(idx, 1);
      }
   }
}

class RenderPart extends RenderObject implements RenderPartInfo {
   public readonly offset?: Point | (() => Point);
   public width: number;
   public height: number;
   public textureSource: string;
   public readonly zIndex: number;
   public readonly inheritParentRotation: boolean;
   public readonly getRotation?: () => number;
   public readonly opacity: number;
   public readonly flipX: boolean;

   /** Whether the render part is being rendered or not */
   public isActive = true;
   
   constructor(renderPartInfo: RenderPartInfo) {
      super();
      
      if (typeof renderPartInfo.textureSource === "undefined") {
         throw new Error("Tried to create a render part with an undefined texture source.");
      }

      this.offset = renderPartInfo.offset;
      this.width = renderPartInfo.width;
      this.height = renderPartInfo.height;
      this.textureSource = renderPartInfo.textureSource;
      this.zIndex = renderPartInfo.zIndex;
      this.inheritParentRotation = typeof renderPartInfo.inheritParentRotation !== "undefined" ? renderPartInfo.inheritParentRotation : true;
      this.getRotation = renderPartInfo.getRotation;
      this.opacity = renderPartInfo.opacity || 1;
      this.flipX = renderPartInfo.flipX || false; // Don't flip X by default
   }

   /** Updates the render part's position based on its parent's position and rotation */
   public updateRenderPosition(parentRenderObject: RenderObject): void {
      this.renderPosition.x = parentRenderObject.renderPosition.x;
      this.renderPosition.y = parentRenderObject.renderPosition.y;

      if (typeof this.offset !== "undefined") {
         let offset: Point;
         if (typeof this.offset === "function") {
            offset = this.offset();
         } else {
            offset = this.offset;
         }

         // Rotate the offset to match the parent object's rotation
         const rotatedOffsetX = rotateXAroundPoint(offset.x, offset.y, 0, 0, parentRenderObject.rotation);
         const rotatedOffsetY = rotateYAroundPoint(offset.x, offset.y, 0, 0, parentRenderObject.rotation);

         this.renderPosition.x += rotatedOffsetX;
         this.renderPosition.y += rotatedOffsetY;
      }

      this.recalculateRotation();
   }

   private recalculateRotation(): void {
      if (typeof this.getRotation !== "undefined") {
         this.rotation = this.getRotation();
         if (isNaN(this.rotation)) {
            console.warn(this);
            throw new Error("Render part's rotation was NaN.");
         }
      }
   }
}

export default RenderPart;