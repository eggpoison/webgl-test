import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import GameObject from "../GameObject";
import Board from "../Board";
import { GAME_OBJECT_TEXTURE_SLOT_INDEXES, getTextureHeight, getTextureWidth } from "../texture-atlases/entity-texture-atlas";

/** A thing which is able to hold render parts */
export abstract class RenderObject {
   /** Estimated position of the object during the current frame */
   public renderPosition = new Point(-1, -1);

   public rotation = 0;
   public totalRotation = 0;
   
   public attachRenderPart(renderPart: RenderPart): void {
      const root = this.getRoot();

      // Don't add if already attached
      if (root.allRenderParts.indexOf(renderPart) !== -1) {
         return;
      }

      Board.numVisibleRenderParts++;
      
      // Add to the root array
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

   public removeRenderPart(renderPart: RenderPart): void {
      // Don't remove if already removed
      const root = this.getRoot();
      const idx = root.allRenderParts.indexOf(renderPart);
      if (idx === -1) {
         return;
      }
      
      Board.numVisibleRenderParts--;
      
      // Remove from the root array
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

   // @Speed: Reduce polymorphism
   public offset?: Point | (() => Point);
   public width: number;
   public height: number;
   public readonly zIndex: number;
   public rotation = 0;

   public opacity = 1;
   public scale = 1;
   public shakeAmount = 0;
   
   /** Slot index of the render part's texture in the game object texture atlas */
   public textureSlotIndex: number;
   public textureWidth: number;
   public textureHeight: number;

   public getRotation?: () => number;

   /** Whether or not the render part will inherit its parents' rotation */
   public inheritParentRotation = true;
   public flipX = false;
   
   constructor(parent: RenderObject, width: number, height: number, textureArrayIndex: number, zIndex: number, rotation: number) {
      super();

      this.parent = parent;
      this.width = width;
      this.height = height;
      this.zIndex = zIndex;
      this.rotation = rotation;

      this.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[textureArrayIndex];
      this.textureWidth = getTextureWidth(textureArrayIndex);
      this.textureHeight = getTextureHeight(textureArrayIndex);
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
            rotatedOffsetX = offset.x;
            rotatedOffsetY = offset.y;
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
         this.totalRotation = this.parent.rotation;
      } else {
         this.totalRotation = 0;
      }
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