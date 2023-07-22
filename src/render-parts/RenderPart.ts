import { Point } from "webgl-test-shared";

export interface RenderPartInfo {
   /** The render part's offset from its parent */
   readonly offset?: () => Point;
   /** Width of the render part */
   readonly width: number;
   /** Height of the render part */
   readonly height: number;
   readonly textureSource: string;
   /** Render priority of the render part in relation to its entity's other render parts. */
   readonly zIndex: number;
   /** Rotation of the render part in radians */
   readonly rotation?: number;
}

/** A thing which is able to hold render parts */
export class RenderObject {
   public renderPosition!: Point;
   public rotation: number = 0;
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

   /** Update the render positions of all render parts associated with the render object */
   public cascadeRenderPosition(): void {
      for (const renderPart of this.renderParts) {
         renderPart.updateRenderPosition();
         
         // Cascade the render parts attached to that render part
         renderPart.cascadeRenderPosition();
      }
   }
}

class RenderPart extends RenderObject implements RenderPartInfo {
   public readonly offset?: () => Point;
   public readonly width: number;
   public readonly height: number;
   public textureSource: string;
   public readonly zIndex: number;

   public readonly parentRenderObject: RenderObject;
   
   constructor(renderPartInfo: RenderPartInfo, parentRenderObject: RenderObject) {
      super();
      
      if (typeof renderPartInfo.textureSource === "undefined") {
         throw new Error("Tried to create a render part with an undefined texture source.");
      }

      this.offset = renderPartInfo.offset;
      this.width = renderPartInfo.width;
      this.height = renderPartInfo.height;
      this.textureSource = renderPartInfo.textureSource;
      this.zIndex = renderPartInfo.zIndex;
      if (typeof renderPartInfo.rotation !== "undefined") this.rotation = renderPartInfo.rotation;

      this.parentRenderObject = parentRenderObject;

      // As soon as the render part is created, calculate an initial position for it.
      this.updateRenderPosition();
   }

   /** Updates the render part's position based on its parent's position and rotation */
   public updateRenderPosition(): void {
      this.renderPosition = this.parentRenderObject.renderPosition.copy();

      if (typeof this.offset !== "undefined") {
         // Offset the parent object's render position
         const offset = this.offset().convertToVector();
         offset.direction += this.parentRenderObject.rotation;

         // if (typeof this.rotation !== "undefined") {
         //    offset.direction += this.rotation;
         // }

         this.renderPosition.add(offset.convertToPoint());
      }
   }
}

export default RenderPart;