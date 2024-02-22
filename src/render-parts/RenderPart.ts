import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

/** A thing which is able to hold render parts */
export abstract class RenderObject {
   /** Estimated position of the object during the current frame */
   public renderPosition = new Point(-1, -1);

   public rotation = 0;
   public totalRotation = 0;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;
}

class RenderPart extends RenderObject {
   public readonly parent: RenderObject;

   // @Speed: Reduce polymorphism
   public offset?: Point | (() => Point);
   public readonly zIndex: number;
   public rotation = 0;

   public opacity = 1;
   public scale = 1;
   public shakeAmount = 0;
   
   public textureArrayIndex: number;

   // @Speed: Reduce polymorphism
   public getRotation?: () => number;

   /** Whether or not the render part will inherit its parents' rotation */
   public inheritParentRotation = true;
   public flipX = false;
   
   constructor(parent: RenderObject, textureArrayIndex: number, zIndex: number, rotation: number) {
      super();

      this.parent = parent;
      this.textureArrayIndex = textureArrayIndex;
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
            rotatedOffsetX = rotateXAroundPoint(offset.x, offset.y, 0, 0, this.parent.rotation + this.parent.totalRotation);
            rotatedOffsetY = rotateYAroundPoint(offset.x, offset.y, 0, 0, this.parent.rotation + this.parent.totalRotation);
         } else {
            rotatedOffsetX = rotateXAroundPoint(offset.x, offset.y, 0, 0, this.parent.totalRotation);
            rotatedOffsetY = rotateYAroundPoint(offset.x, offset.y, 0, 0, this.parent.totalRotation);
         }

         this.renderPosition.x += rotatedOffsetX;
         this.renderPosition.y += rotatedOffsetY;
      }

      // Shake
      if (this.shakeAmount > 0) {
         const direction = 2 * Math.PI * Math.random();
         this.renderPosition.x += this.shakeAmount * Math.sin(direction);
         this.renderPosition.y += this.shakeAmount * Math.cos(direction);
      }

      // Recalculate rotation
      // @Incomplete: Will this work for deeply nested render parts?
      if (this.inheritParentRotation) {
         this.totalRotation = this.parent.rotation + this.parent.totalRotation;
      } else {
         this.totalRotation = this.parent.totalRotation;
      }
      if (typeof this.getRotation !== "undefined") {
         this.rotation = this.getRotation();
         if (isNaN(this.rotation)) {
            console.warn(this);
            throw new Error("Render part's rotation was NaN.");
         }
      }
   }

   public switchTextureSource(newTextureSource: string): void {
      this.textureArrayIndex = getTextureArrayIndex(newTextureSource);
   }
}

export default RenderPart;