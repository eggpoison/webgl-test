import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import GameObject from "../GameObject";

/** A thing which is able to hold render parts */
export abstract class RenderObject {
   /** Estimated position of the object during the current frame */
   public renderPosition = new Point(-1, -1);

   public rotation = 0;
   
   /** Stores all render parts attached to the object */
   public readonly renderParts = new Array<RenderPart>();

   public attachRenderPart(renderPart: RenderPart): void {
      this.renderParts.push(renderPart);

      if (renderPart.isActive) {
         // Add to the root array
         const root = this.getRoot();
         let idx = root.allRenderParts.length;
         for (let i = 0; i < root.allRenderParts.length; i++) {
            const currentRenderPart = root.allRenderParts[i];
            if (renderPart.zIndex < currentRenderPart.zIndex) {
               idx = i;
               break;
            }
         }
         root.allRenderParts.splice(idx, 0, renderPart);
         
         // @Incomplete: add children
      }
   }

   public removeRenderPart(renderPart: RenderPart): void {
      const idx = this.renderParts.indexOf(renderPart);
      if (idx !== -1) {
         this.renderParts.splice(idx, 1);
      }

      // Remove from the root array
      const root = this.getRoot();
      root.allRenderParts.splice(root.allRenderParts.indexOf(renderPart), 1);

      // @Incomplete: remove children
   }

   private getRoot(): GameObject {
      // @Cleanup: don't use hasOwnProperty, don't use as, maybe remove while loop
      let root: RenderObject = this;
      while (root.hasOwnProperty("parent")) {
         root = (root as RenderPart).parent;
      }
      return root as GameObject;
   }
}

class RenderPart extends RenderObject {
   public readonly parent: RenderObject;

   public offset?: Point | (() => Point);
   public width: number;
   public height: number;
   public textureSource: string;
   public readonly zIndex: number;
   public rotation = 0;
   public opacity = 1;

   public totalRotation = 0;

   public getRotation?: () => number;

   /** Whether or not the render part will inherit its parents' rotation */
   public inheritParentRotation = true;
   /** Whether the render part is being rendered or not */
   public isActive = true;
   public flipX = false;
   
   constructor(parent: RenderObject, width: number, height: number, textureSource: string, zIndex: number, rotation: number) {
      super();
      
      if (typeof textureSource === "undefined") {
         throw new Error("Tried to create a render part with an undefined texture source.");
      }

      this.parent = parent;
      this.width = width;
      this.height = height;
      this.textureSource = textureSource;
      this.zIndex = zIndex;
      this.rotation = rotation;
   }

   /** Updates the render part based on its parent */
   public update(): void {
      this.renderPosition.x = this.parent.renderPosition.x;
      this.renderPosition.y = this.parent.renderPosition.y;

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
            rotatedOffsetX = rotateXAroundPoint(offset.x, offset.y, 0, 0, this.parent.rotation);
            rotatedOffsetY = rotateYAroundPoint(offset.x, offset.y, 0, 0, this.parent.rotation);
         } else {
            rotatedOffsetX = offset.x;
            rotatedOffsetY = offset.y;
         }

         this.renderPosition.x += rotatedOffsetX;
         this.renderPosition.y += rotatedOffsetY;
      }

      // Recalculate rotation
      this.totalRotation = this.parent.rotation;
      if (typeof this.getRotation !== "undefined") {
         this.rotation = this.getRotation();
         this.totalRotation += this.rotation;
         if (isNaN(this.rotation)) {
            console.warn(this);
            throw new Error("Render part's rotation was NaN.");
         }
      }
   }
}

export default RenderPart;