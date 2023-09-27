import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";

/** A thing which is able to hold render parts */
export class RenderObject {
   /** Estimated position of the object during the current frame */
   public renderPosition = new Point(-1, -1);

   public rotation = 0;
   
   public readonly renderParts = new Array<RenderPart>();

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

class RenderPart extends RenderObject {
   public offset?: Point | (() => Point);
   public width: number;
   public height: number;
   public textureSource: string;
   public readonly zIndex: number;
   public rotation = 0;
   public opacity = 1;

   public getRotation?: () => number;

   /** Whether or not the render part will inherit its parents' rotation */
   public inheritParentRotation = true;
   /** Whether the render part is being rendered or not */
   public isActive = true;
   public flipX = false;
   
   constructor(width: number, height: number, textureSource: string, zIndex: number, rotation: number) {
      super();
      
      if (typeof textureSource === "undefined") {
         throw new Error("Tried to create a render part with an undefined texture source.");
      }

      this.width = width;
      this.height = height;
      this.textureSource = textureSource;
      this.zIndex = zIndex;
      this.rotation = rotation;
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
         let rotatedOffsetX: number;
         let rotatedOffsetY: number;
         if (this.inheritParentRotation) {
            rotatedOffsetX = rotateXAroundPoint(offset.x, offset.y, 0, 0, parentRenderObject.rotation);
            rotatedOffsetY = rotateYAroundPoint(offset.x, offset.y, 0, 0, parentRenderObject.rotation);
         } else {
            rotatedOffsetX = offset.x;
            rotatedOffsetY = offset.y;
         }

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