import { circleAndRectangleDoIntersect, computeSideAxis, HitboxVertexPositions, Point, rectanglePointsDoIntersect, rotatePoint, Vector } from "webgl-test-shared";
import Hitbox, { HitboxBounds } from "./Hitbox";
import CircularHitbox from "./CircularHitbox";

class RectangularHitbox extends Hitbox {
   public width: number;
   public height: number;
   
   /** Length of half of the diagonal of the rectangle */
   public readonly halfDiagonalLength: number;

   public vertexPositions!: HitboxVertexPositions;
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

      let topLeft = new Point(x1, y2);
      let topRight = new Point(x2, y2);
      let bottomLeft = new Point(x1, y1);
      let bottomRight = new Point(x2, y1);

      // Rotate the points to match the entity's rotation
      topLeft = rotatePoint(topLeft, this.gameObject.position, this.gameObject.rotation);
      topRight = rotatePoint(topRight, this.gameObject.position, this.gameObject.rotation);
      bottomLeft = rotatePoint(bottomLeft, this.gameObject.position, this.gameObject.rotation);
      bottomRight = rotatePoint(bottomRight, this.gameObject.position, this.gameObject.rotation);

      if (typeof this.offset !== "undefined") {
         topLeft.add(this.offset);
         topRight.add(this.offset);
         bottomLeft.add(this.offset);
         bottomRight.add(this.offset);
      }

      this.vertexPositions = [topLeft, topRight, bottomLeft, bottomRight];
   }

   public computeSideAxes(): void {
      this.sideAxes = [
         computeSideAxis(this.vertexPositions[0], this.vertexPositions[1]),
         computeSideAxis(this.vertexPositions[0], this.vertexPositions[2])
      ];
   }

   public calculateHitboxBounds(): HitboxBounds {
      const minX = Math.min(this.vertexPositions[0].x, this.vertexPositions[1].x, this.vertexPositions[2].x, this.vertexPositions[3].x);
      const maxX = Math.max(this.vertexPositions[0].x, this.vertexPositions[1].x, this.vertexPositions[2].x, this.vertexPositions[3].x);
      const minY = Math.min(this.vertexPositions[0].y, this.vertexPositions[1].y, this.vertexPositions[2].y, this.vertexPositions[3].y);
      const maxY = Math.max(this.vertexPositions[0].y, this.vertexPositions[1].y, this.vertexPositions[2].y, this.vertexPositions[3].y);
      return [minX, maxX, minY, maxY];
   }

   public isColliding(otherHitbox: CircularHitbox | RectangularHitbox): boolean {
      if (otherHitbox.hasOwnProperty("radius")) {
         // Circular
         return circleAndRectangleDoIntersect(otherHitbox.gameObject.position, (otherHitbox as CircularHitbox).radius, this.gameObject.position, this.width, this.height, this.gameObject.rotation);
      } else {
         // Rectangular

         // If the distance between the entities is greater than the sum of their half diagonals then they're not colliding
         const distance = this.gameObject.position.calculateDistanceBetween(otherHitbox.gameObject.position);
         if (distance > this.halfDiagonalLength + (otherHitbox as RectangularHitbox).halfDiagonalLength) {
            return false;
         }
         
         return rectanglePointsDoIntersect(this.vertexPositions, (otherHitbox as RectangularHitbox).vertexPositions, this.sideAxes, (otherHitbox as RectangularHitbox).sideAxes);
      }
   }
}

export default RectangularHitbox;