import { circleAndRectangleDoIntersect, HitboxVertexPositions, Point, rectanglePointsDoIntersect, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import Hitbox from "./Hitbox";
import CircularHitbox from "./CircularHitbox";
import GameObject from "../GameObject";

class RectangularHitbox extends Hitbox {
   public width: number;
   public height: number;

   public rotation = 0;
   public externalRotation = 0;
   
   /** Length of half of the diagonal of the rectangle */
   public halfDiagonalLength: number;

   public vertexPositions: HitboxVertexPositions = [new Point(-1, -1), new Point(-1, -1), new Point(-1, -1), new Point(-1, -1)];

   public sideAxes = [new Point(0, 0), new Point(0, 0)] as const;

   constructor(mass: number, width: number, height: number, localID: number) {
      super(mass, localID);
      
      this.width = width;
      this.height = height;
      this.halfDiagonalLength = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
   }

   public recalculateHalfDiagonalLength(): void {
      this.halfDiagonalLength = Math.sqrt(Math.pow(this.width / 2, 2) + Math.pow(this.height / 2, 2));
   }

   public updateFromGameObject(gameObject: GameObject): void {
      super.updateFromGameObject(gameObject);
      this.externalRotation = gameObject.rotation;
   }

   private computeVertexPositions(offsetRotation: number): void {
      const x1 = this.position.x - this.width / 2;
      const x2 = this.position.x + this.width / 2;
      const y1 = this.position.y - this.height / 2;
      const y2 = this.position.y + this.height / 2;

      // Top left
      this.vertexPositions[0].x = rotateXAroundPoint(x1, y2, this.position.x, this.position.y, this.rotation + offsetRotation);
      this.vertexPositions[0].y = rotateYAroundPoint(x1, y2, this.position.x, this.position.y, this.rotation + offsetRotation);
      // Top right
      this.vertexPositions[1].x = rotateXAroundPoint(x2, y2, this.position.x, this.position.y, this.rotation + offsetRotation);
      this.vertexPositions[1].y = rotateYAroundPoint(x2, y2, this.position.x, this.position.y, this.rotation + offsetRotation);
      // Bottom right
      this.vertexPositions[2].x = rotateXAroundPoint(x2, y1, this.position.x, this.position.y, this.rotation + offsetRotation);
      this.vertexPositions[2].y = rotateYAroundPoint(x2, y1, this.position.x, this.position.y, this.rotation + offsetRotation);
      // Bottom left
      this.vertexPositions[3].x = rotateXAroundPoint(x1, y1, this.position.x, this.position.y, this.rotation + offsetRotation);
      this.vertexPositions[3].y = rotateYAroundPoint(x1, y1, this.position.x, this.position.y, this.rotation + offsetRotation);
   }

   public computeSideAxes(): void {
      const angle1 = this.vertexPositions[0].calculateAngleBetween(this.vertexPositions[1]);
      this.sideAxes[0].x = Math.sin(angle1);
      this.sideAxes[0].y = Math.cos(angle1);
      
      const angle2 = angle1 + Math.PI/2;
      this.sideAxes[1].x = Math.sin(angle2);
      this.sideAxes[1].y = Math.cos(angle2);
   }

   public updateHitboxBounds(offsetRotation: number): void {
      this.computeVertexPositions(offsetRotation);
      this.computeSideAxes();

      this.bounds[0] = Math.min(this.vertexPositions[0].x, this.vertexPositions[1].x, this.vertexPositions[2].x, this.vertexPositions[3].x);
      this.bounds[1] = Math.max(this.vertexPositions[0].x, this.vertexPositions[1].x, this.vertexPositions[2].x, this.vertexPositions[3].x);
      this.bounds[2] = Math.min(this.vertexPositions[0].y, this.vertexPositions[1].y, this.vertexPositions[2].y, this.vertexPositions[3].y);
      this.bounds[3] = Math.max(this.vertexPositions[0].y, this.vertexPositions[1].y, this.vertexPositions[2].y, this.vertexPositions[3].y);
   }

   public isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean {
      if (otherHitbox.hasOwnProperty("radius")) {
         // Circular
         return circleAndRectangleDoIntersect(otherHitbox.position.x, otherHitbox.position.y, (otherHitbox as CircularHitbox).radius, this.position.x, this.position.y, this.width, this.height, this.rotation + this.externalRotation);
      } else {
         // Rectangular

         // If the distance between the hitboxes is greater than the sum of their half diagonals then they're not colliding
         const distance = this.position.calculateDistanceBetween(otherHitbox.position);
         if (distance > this.halfDiagonalLength + (otherHitbox as RectangularHitbox).halfDiagonalLength) {
            return false;
         }
         
         return rectanglePointsDoIntersect(this.vertexPositions, (otherHitbox as RectangularHitbox).vertexPositions, 0, 0, 0, 0, this.sideAxes, (otherHitbox as RectangularHitbox).sideAxes);
      }
   }
}

export default RectangularHitbox;