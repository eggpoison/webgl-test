import { circleAndRectangleDoIntersect, HitboxVertexPositions, Point, rectanglePointsDoIntersect, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import Hitbox from "./Hitbox";
import CircularHitbox from "./CircularHitbox";

class RectangularHitbox extends Hitbox {
   public width: number;
   public height: number;

   public rotation = 0;
   
   /** Length of half of the diagonal of the rectangle */
   public readonly halfDiagonalLength: number;

   public vertexPositions: HitboxVertexPositions = [new Point(-1, -1), new Point(-1, -1), new Point(-1, -1), new Point(-1, -1)];

   public sideAxes = [new Point(0, 0), new Point(0, 0)] as const;

   constructor(width: number, height: number, offset?: Point) {
      super(offset);

      this.width = width;
      this.height = height;
      this.halfDiagonalLength = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
   }

   private computeVertexPositions(): void {
      const x1 = this.position.x - this.width / 2;
      const x2 = this.position.x + this.width / 2;
      const y1 = this.position.y - this.height / 2;
      const y2 = this.position.y + this.height / 2;

      // Top left
      this.vertexPositions[0].x = rotateXAroundPoint(x1, y2, this.position.x, this.position.y, this.rotation);
      this.vertexPositions[0].y = rotateYAroundPoint(x1, y2, this.position.x, this.position.y, this.rotation);
      // Top right
      this.vertexPositions[1].x = rotateXAroundPoint(x2, y2, this.position.x, this.position.y, this.rotation);
      this.vertexPositions[1].y = rotateYAroundPoint(x2, y2, this.position.x, this.position.y, this.rotation);
      // Bottom left
      this.vertexPositions[2].x = rotateXAroundPoint(x1, y1, this.position.x, this.position.y, this.rotation);
      this.vertexPositions[2].y = rotateYAroundPoint(x1, y1, this.position.x, this.position.y, this.rotation);
      // Bottom right
      this.vertexPositions[3].x = rotateXAroundPoint(x2, y1, this.position.x, this.position.y, this.rotation);
      this.vertexPositions[3].y = rotateYAroundPoint(x2, y1, this.position.x, this.position.y, this.rotation);

      if (typeof this.offset !== "undefined") {
         // @Incomplete: account for parent rotation
         this.vertexPositions[0].add(this.offset);
         this.vertexPositions[1].add(this.offset);
         this.vertexPositions[2].add(this.offset);
         this.vertexPositions[3].add(this.offset);
      }
   }

   public computeSideAxes(): void {
      const angle1 = this.vertexPositions[0].calculateAngleBetween(this.vertexPositions[1]);
      this.sideAxes[0].x = Math.sin(angle1);
      this.sideAxes[0].y = Math.cos(angle1);
      
      const angle2 = this.vertexPositions[2].calculateAngleBetween(this.vertexPositions[3]);
      this.sideAxes[1].x = Math.sin(angle2);
      this.sideAxes[1].y = Math.cos(angle2);
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
         return circleAndRectangleDoIntersect(otherHitbox.position, (otherHitbox as CircularHitbox).radius, this.position, this.width, this.height, this.rotation);
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