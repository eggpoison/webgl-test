import { circleAndRectangleDoIntersect, computeSideAxis, HitboxVertexPositions, Point, rectanglePointsDoIntersect, rotateXAroundPoint, rotateYAroundPoint, Vector } from "webgl-test-shared";
import Hitbox from "./Hitbox";
import CircularHitbox from "./CircularHitbox";

class RectangularHitbox extends Hitbox {
   public width: number;
   public height: number;
   
   /** Length of half of the diagonal of the rectangle */
   public readonly halfDiagonalLength: number;

   public vertexPositions: HitboxVertexPositions = [
      new Point(-1, -1),
      new Point(-1, -1),
      new Point(-1, -1),
      new Point(-1, -1)
   ];

   public sideAxes!: [axis1: Vector, axis2: Vector];

   constructor(width: number, height: number, offset?: Point) {
      super(offset);

      this.width = width;
      this.height = height;
      this.halfDiagonalLength = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
   }

   public computeVertexPositions(): void {
      const x1 = this.gameObject.position.x - this.width / 2;
      const x2 = this.gameObject.position.x + this.width / 2;
      const y1 = this.gameObject.position.y - this.height / 2;
      const y2 = this.gameObject.position.y + this.height / 2;

      // Top left
      this.vertexPositions[0].x = rotateXAroundPoint(x1, y2, this.gameObject.position.x, this.gameObject.position.y, this.gameObject.rotation);
      this.vertexPositions[0].y = rotateYAroundPoint(x1, y2, this.gameObject.position.x, this.gameObject.position.y, this.gameObject.rotation);
      // Top right
      this.vertexPositions[1].x = rotateXAroundPoint(x2, y2, this.gameObject.position.x, this.gameObject.position.y, this.gameObject.rotation);
      this.vertexPositions[1].y = rotateYAroundPoint(x2, y2, this.gameObject.position.x, this.gameObject.position.y, this.gameObject.rotation);
      // Bottom left
      this.vertexPositions[2].x = rotateXAroundPoint(x1, y1, this.gameObject.position.x, this.gameObject.position.y, this.gameObject.rotation);
      this.vertexPositions[2].y = rotateYAroundPoint(x1, y1, this.gameObject.position.x, this.gameObject.position.y, this.gameObject.rotation);
      // Bottom right
      this.vertexPositions[3].x = rotateXAroundPoint(x2, y1, this.gameObject.position.x, this.gameObject.position.y, this.gameObject.rotation);
      this.vertexPositions[3].y = rotateYAroundPoint(x2, y1, this.gameObject.position.x, this.gameObject.position.y, this.gameObject.rotation);

      if (typeof this.offset !== "undefined") {
         this.vertexPositions[0].add(this.offset);
         this.vertexPositions[1].add(this.offset);
         this.vertexPositions[2].add(this.offset);
         this.vertexPositions[3].add(this.offset);
      }
   }

   public computeSideAxes(): void {
      this.sideAxes = [
         computeSideAxis(this.vertexPositions[0], this.vertexPositions[1]),
         computeSideAxis(this.vertexPositions[0], this.vertexPositions[2])
      ];
   }

   public updateHitboxBounds(): void {
      this.computeVertexPositions();
      this.computeSideAxes();

      this.bounds[0] = Math.min(this.vertexPositions[0].x, this.vertexPositions[1].x, this.vertexPositions[2].x, this.vertexPositions[3].x);
      this.bounds[1] = Math.max(this.vertexPositions[0].x, this.vertexPositions[1].x, this.vertexPositions[2].x, this.vertexPositions[3].x);
      this.bounds[2] = Math.min(this.vertexPositions[0].y, this.vertexPositions[1].y, this.vertexPositions[2].y, this.vertexPositions[3].y);
      this.bounds[3] = Math.max(this.vertexPositions[0].y, this.vertexPositions[1].y, this.vertexPositions[2].y, this.vertexPositions[3].y);
   }

   public isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean {
      if (otherHitbox.hasOwnProperty("radius")) {
         // Circular
         return circleAndRectangleDoIntersect(otherHitbox.position, (otherHitbox as CircularHitbox).radius, this.position, this.width, this.height, this.gameObject.rotation);
      } else {
         // Rectangular

         // If the distance between the hitboxes is greater than the sum of their half diagonals then they're not colliding
         const distance = this.position.calculateDistanceBetween(otherHitbox.position);
         if (distance > this.halfDiagonalLength + (otherHitbox as RectangularHitbox).halfDiagonalLength) {
            return false;
         }
         
         return rectanglePointsDoIntersect(this.vertexPositions, (otherHitbox as RectangularHitbox).vertexPositions, this.sideAxes, (otherHitbox as RectangularHitbox).sideAxes);
      }
   }
}

export default RectangularHitbox;